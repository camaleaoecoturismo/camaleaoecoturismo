-- Delete duplicate tickets (keeping only the most recent one per CPF per reservation)
DELETE FROM tickets 
WHERE id IN (
  '9dd8f4a6-e87d-4ade-b67e-5e50f024a737',
  '02d4b164-451e-46e5-bf91-3a8a0edd86f3',
  '14cee5ab-95bf-4f2d-ba09-b03d1f30de26',
  '09b02bf3-ad70-4e4a-9765-3fd02f0548d8',
  'e6b218a0-05b2-42bd-8528-0026200e46a0',
  '3afb4755-8113-4787-8f56-1c3199c302c9',
  'f23a8b08-a466-425f-864d-890aad341889',
  '3be8d04c-d163-418a-a416-f5890be93baf',
  '82fb099c-7a3a-4946-9554-763c9b5ddb2d'
);