import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    const { action, task, userId = 'default' } = await req.json();

    // Get stored tokens
    const { data: integration, error: tokenError } = await supabase
      .from('ticktick_integrations')
      .select('*')
      .eq('user_id', userId)
      .single();

    // IMPORTANT: return 200 with needsAuth to avoid client-side hard failures on 401
    // (frontend can still treat needsAuth as "not connected").
    if (tokenError || !integration) {
      console.warn('TickTick not connected for userId:', userId, 'tokenError:', tokenError?.message);
      return new Response(JSON.stringify({
        error: 'TickTick not connected',
        needsAuth: true,
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if token is expired
    if (new Date(integration.expires_at) < new Date()) {
      console.warn('TickTick token expired for userId:', userId);
      return new Response(JSON.stringify({
        error: 'Token expired, please reconnect',
        needsAuth: true,
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const headers = {
      'Authorization': `Bearer ${integration.access_token}`,
      'Content-Type': 'application/json',
    };

    let result;

    console.log('TickTick sync action:', action, 'userId:', userId);

    switch (action) {
      case 'get_projects': {
        console.log('Fetching TickTick projects...');
        const response = await fetch('https://api.ticktick.com/open/v1/project', { headers });
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Failed to fetch projects:', errorText);
          if (errorText.includes('invalid_token') || response.status === 401) {
            return new Response(JSON.stringify({
              error: 'Token revoked or invalid, please reconnect',
              needsAuth: true,
            }), {
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
          throw new Error(`Failed to fetch projects: ${errorText}`);
        }
        result = await response.json();
        console.log('Projects fetched:', result?.length);
        break;
      }

      case 'get_tasks': {
        const projectId = task?.projectId;
        const url = projectId 
          ? `https://api.ticktick.com/open/v1/project/${projectId}/data`
          : 'https://api.ticktick.com/open/v1/project';
        
        console.log('Fetching TickTick tasks from:', url);
        const response = await fetch(url, { headers });
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Failed to fetch tasks:', errorText);
          throw new Error(`Failed to fetch tasks: ${errorText}`);
        }
        result = await response.json();
        console.log('Tasks fetched');
        break;
      }

      case 'create_task': {
        console.log('Creating TickTick task:', task.title);
        const ticktickTask = {
          title: task.title,
          content: task.description || '',
          dueDate: task.due_date,
          priority: mapPriorityToTickTick(task.quadrant),
          projectId: task.ticktick_project_id || undefined,
        };
        console.log('TickTick task payload:', ticktickTask);
        
        const response = await fetch('https://api.ticktick.com/open/v1/task', {
          method: 'POST',
          headers,
          body: JSON.stringify(ticktickTask),
        });
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Failed to create task:', errorText);
          throw new Error(`Failed to create task: ${errorText}`);
        }
        result = await response.json();
        console.log('Task created in TickTick:', result.id);
        
        // Store mapping
        const { error: mappingError } = await supabase.from('task_ticktick_mapping').upsert({
          task_id: task.id,
          ticktick_task_id: result.id,
          ticktick_project_id: result.projectId,
          user_id: userId,
        }, { onConflict: 'task_id' });
        
        if (mappingError) {
          console.error('Failed to store mapping:', mappingError);
        }
        break;
      }

      case 'update_task': {
        console.log('Updating/creating TickTick task:', task.id, task.title);
        
        // Get mapping
        const { data: mapping } = await supabase
          .from('task_ticktick_mapping')
          .select('ticktick_task_id, ticktick_project_id')
          .eq('task_id', task.id)
          .single();

        if (!mapping) {
          console.log('No mapping found, creating new task in TickTick');
          // Create if not exists
          const ticktickTask = {
            title: task.title,
            content: task.description || '',
            dueDate: task.due_date,
            priority: mapPriorityToTickTick(task.quadrant),
          };
          
          const response = await fetch('https://api.ticktick.com/open/v1/task', {
            method: 'POST',
            headers,
            body: JSON.stringify(ticktickTask),
          });
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error('Failed to create task:', errorText);
            throw new Error(`Failed to create task: ${errorText}`);
          }
          
          result = await response.json();
          console.log('Task created in TickTick:', result.id);
          
          await supabase.from('task_ticktick_mapping').insert({
            task_id: task.id,
            ticktick_task_id: result.id,
            ticktick_project_id: result.projectId,
            user_id: userId,
          });
          break;
        }

        console.log('Mapping found, updating existing task:', mapping.ticktick_task_id);
        const updatePayload = {
          id: mapping.ticktick_task_id,
          projectId: mapping.ticktick_project_id,
          title: task.title,
          content: task.description || '',
          dueDate: task.due_date,
          priority: mapPriorityToTickTick(task.quadrant),
          status: task.status === 'done' ? 2 : 0,
        };
        console.log('Update payload:', updatePayload);
        
        const response = await fetch(`https://api.ticktick.com/open/v1/task/${mapping.ticktick_task_id}`, {
          method: 'POST',
          headers,
          body: JSON.stringify(updatePayload),
        });
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Failed to update task:', errorText);
          throw new Error(`Failed to update task: ${errorText}`);
        }
        result = await response.json();
        console.log('Task updated in TickTick');
        break;
      }

      case 'delete_task': {
        console.log('Deleting task from TickTick:', task.id);
        const { data: mapping } = await supabase
          .from('task_ticktick_mapping')
          .select('ticktick_task_id, ticktick_project_id')
          .eq('task_id', task.id)
          .single();

        if (mapping) {
          const response = await fetch(`https://api.ticktick.com/open/v1/project/${mapping.ticktick_project_id}/task/${mapping.ticktick_task_id}`, {
            method: 'DELETE',
            headers,
          });
          
          console.log('Delete response:', response.ok);
          
          // Remove mapping
          await supabase
            .from('task_ticktick_mapping')
            .delete()
            .eq('task_id', task.id);
          
          result = { deleted: response.ok };
        } else {
          result = { deleted: false, reason: 'no_mapping' };
        }
        break;
      }

      case 'sync_from_ticktick': {
        console.log('Syncing tasks from TickTick...');
        // Fetch all projects and tasks from TickTick
        const projectsRes = await fetch('https://api.ticktick.com/open/v1/project', { headers });
        if (!projectsRes.ok) {
          const errorText = await projectsRes.text();
          console.error('Failed to fetch projects:', errorText);
          throw new Error(`Failed to fetch projects: ${errorText}`);
        }
        const projects = await projectsRes.json();
        console.log('Found projects:', projects.length);
        
        const allTasks = [];
        for (const project of projects) {
          console.log('Fetching tasks from project:', project.name, project.id);
          const tasksRes = await fetch(`https://api.ticktick.com/open/v1/project/${project.id}/data`, { headers });
          if (tasksRes.ok) {
            const projectData = await tasksRes.json();
            console.log('Project data:', projectData);
            if (projectData.tasks) {
              allTasks.push(...projectData.tasks.map((t: any) => ({ ...t, projectName: project.name, projectId: project.id })));
            }
          } else {
            console.error('Failed to fetch tasks from project:', project.id);
          }
        }
        
        console.log('Total tasks from TickTick:', allTasks.length);
        
        // Import tasks to local database
        let imported = 0;
        for (const tickTask of allTasks) {
          // Check if already mapped
          const { data: existing } = await supabase
            .from('task_ticktick_mapping')
            .select('task_id')
            .eq('ticktick_task_id', tickTask.id)
            .single();

          if (!existing) {
            console.log('Importing new task:', tickTask.title);
            // Create new local task
            const { data: newTask, error: insertError } = await supabase.from('tasks').insert({
              title: tickTask.title,
              description: tickTask.content || null,
              due_date: tickTask.dueDate || null,
              status: tickTask.status === 2 ? 'done' : 'backlog',
              quadrant: mapPriorityFromTickTick(tickTask.priority),
              user_id: userId,
            }).select().single();

            if (insertError) {
              console.error('Failed to insert task:', insertError);
              continue;
            }

            if (newTask) {
              await supabase.from('task_ticktick_mapping').insert({
                task_id: newTask.id,
                ticktick_task_id: tickTask.id,
                ticktick_project_id: tickTask.projectId,
                user_id: userId,
              });
              imported++;
            }
          } else {
            console.log('Task already mapped:', tickTask.title);
          }
        }
        
        console.log('Import complete. Imported:', imported, 'of', allTasks.length);
        result = { synced: allTasks.length, imported };
        break;
      }

      default:
        return new Response(JSON.stringify({ error: 'Unknown action' }), { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('TickTick sync error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function mapPriorityToTickTick(quadrant: string): number {
  // TickTick priority: 0 = none, 1 = low, 3 = medium, 5 = high
  // Local quadrants use underscores matching EISENHOWER_QUADRANTS ids
  switch (quadrant) {
    case 'urgent_important': return 5;
    case 'not_urgent_important': return 3;
    case 'urgent_not_important': return 3;
    case 'not_urgent_not_important': return 1;
    default: return 0;
  }
}

function mapPriorityFromTickTick(priority: number): string {
  switch (priority) {
    case 5: return 'urgent_important';
    case 3: return 'not_urgent_important';
    case 1: return 'not_urgent_not_important';
    default: return 'not_urgent_not_important';
  }
}

async function handleAction(action: string, task: any, headers: any, supabase: any, userId: string) {
  // Recursive call helper for create if not exists scenario
  const response = await fetch('https://api.ticktick.com/open/v1/task', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      title: task.title,
      content: task.description || '',
      dueDate: task.due_date,
      priority: mapPriorityToTickTick(task.quadrant),
    }),
  });
  const result = await response.json();
  
  await supabase.from('task_ticktick_mapping').upsert({
    task_id: task.id,
    ticktick_task_id: result.id,
    ticktick_project_id: result.projectId,
    user_id: userId,
  }, { onConflict: 'task_id' });
  
  return new Response(JSON.stringify(result), {
    headers: { 'Content-Type': 'application/json' },
  });
}
