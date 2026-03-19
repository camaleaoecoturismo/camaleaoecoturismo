import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Lightbulb, Calendar, BarChart3, Brain, Megaphone } from 'lucide-react';
import { useContentIdeas, useContentPosts, useContentCampaigns, useContentStats } from '@/hooks/useContentPlanning';
import { useTours } from '@/hooks/useTours';
import ContentIdeasBank from './ContentIdeasBank';
import ContentCalendar from './ContentCalendar';
import ContentDashboard from './ContentDashboard';
import ContentAIAssistant from './ContentAIAssistant';
import ContentCampaignsManager from './ContentCampaignsManager';

interface ContentPlanningModuleProps {
  subView?: string | null;
}

const ContentPlanningModule: React.FC<ContentPlanningModuleProps> = ({ subView }) => {
  const [activeTab, setActiveTab] = useState(subView || 'ideias');
  
  const { ideas, loading: loadingIdeas, createIdea, updateIdea, deleteIdea, convertIdeaToPost } = useContentIdeas();
  const { posts, loading: loadingPosts, createPost, updatePost, deletePost, movePostToDate } = useContentPosts();
  const { campaigns, loading: loadingCampaigns, createCampaign } = useContentCampaigns();
  const { tours, loading: loadingTours } = useTours();
  const { stats, alerts } = useContentStats(posts);

  const loading = loadingIdeas || loadingPosts;

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-flex">
          <TabsTrigger value="ideias" className="gap-2">
            <Lightbulb className="h-4 w-4" />
            <span className="hidden sm:inline">Ideias</span>
          </TabsTrigger>
          <TabsTrigger value="calendario" className="gap-2">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">Calendário</span>
          </TabsTrigger>
          <TabsTrigger value="campanhas" className="gap-2">
            <Megaphone className="h-4 w-4" />
            <span className="hidden sm:inline">Campanhas</span>
          </TabsTrigger>
          <TabsTrigger value="dashboard" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Visão Geral</span>
          </TabsTrigger>
          <TabsTrigger value="assistente" className="gap-2">
            <Brain className="h-4 w-4" />
            <span className="hidden sm:inline">Assistente IA</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ideias" className="mt-6">
          <ContentIdeasBank
            ideas={ideas}
            loading={loadingIdeas}
            onCreateIdea={createIdea}
            onUpdateIdea={updateIdea}
            onDeleteIdea={deleteIdea}
            onConvertToPost={convertIdeaToPost}
          />
        </TabsContent>

        <TabsContent value="calendario" className="mt-6">
          <ContentCalendar
            posts={posts}
            ideas={ideas}
            campaigns={campaigns}
            tours={tours}
            loading={loadingPosts || loadingTours}
            onCreatePost={createPost}
            onUpdatePost={updatePost}
            onDeletePost={deletePost}
            onMovePost={movePostToDate}
            onConvertIdea={convertIdeaToPost}
          />
        </TabsContent>

        <TabsContent value="campanhas" className="mt-6">
          <ContentCampaignsManager
            campaigns={campaigns}
            loading={loadingCampaigns}
            onCreateCampaign={createCampaign}
            posts={posts}
          />
        </TabsContent>

        <TabsContent value="dashboard" className="mt-6">
          <ContentDashboard
            stats={stats}
            alerts={alerts}
            posts={posts}
            ideas={ideas}
          />
        </TabsContent>

        <TabsContent value="assistente" className="mt-6">
          <ContentAIAssistant
            posts={posts}
            ideas={ideas}
            stats={stats}
            onCreatePost={createPost}
            onCreateIdea={createIdea}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ContentPlanningModule;
