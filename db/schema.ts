import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
export const projects=sqliteTable('projects',{
 id:text('id').primaryKey(),userId:text('user_id').notNull(),title:text('title').notNull(),
 state:text('state').notNull(),revision:integer('revision').notNull().default(0),createdAt:integer('created_at').notNull(),updatedAt:integer('updated_at').notNull()
},t=>[index('idx_projects_user_updated').on(t.userId,t.updatedAt)]);
export const messages=sqliteTable('messages',{
 id:text('id').primaryKey(),projectId:text('project_id').notNull().references(()=>projects.id),role:text('role').notNull(),text:text('text').notNull(),createdAt:integer('created_at').notNull()
},t=>[index('idx_messages_project_created').on(t.projectId,t.createdAt)]);
export const memories=sqliteTable('memories',{
 id:text('id').primaryKey(),userId:text('user_id').notNull(),projectId:text('project_id').references(()=>projects.id),text:text('text').notNull(),createdAt:integer('created_at').notNull(),updatedAt:integer('updated_at').notNull().default(0),scope:text('scope').notNull().default('project'),conversationId:text('conversation_id'),category:text('category').notNull().default('preference'),embedding:text('embedding'),embeddingModel:text('embedding_model'),revision:integer('revision').notNull().default(0)
},t=>[index('idx_memories_user_project').on(t.userId,t.projectId)]);
export const versions=sqliteTable('versions',{
 id:text('id').primaryKey(),projectId:text('project_id').notNull().references(()=>projects.id),label:text('label').notNull(),state:text('state').notNull(),createdAt:integer('created_at').notNull()
},t=>[index('idx_versions_project_created').on(t.projectId,t.createdAt)]);
export const assets=sqliteTable('assets',{
 id:text('id').primaryKey(),projectId:text('project_id').notNull().references(()=>projects.id),name:text('name').notNull(),mime:text('mime').notNull(),size:integer('size').notNull(),objectKey:text('object_key').notNull(),metadata:text('metadata').notNull().default('{}'),createdAt:integer('created_at').notNull()
},t=>[index('idx_assets_project_created').on(t.projectId,t.createdAt)]);
export const runs=sqliteTable('runs',{
 id:text('id').primaryKey(),projectId:text('project_id').notNull().references(()=>projects.id),status:text('status').notNull(),mode:text('mode').notNull(),tasks:text('tasks').notNull(),output:text('output'),error:text('error'),revision:integer('revision').notNull(),createdAt:integer('created_at').notNull(),updatedAt:integer('updated_at').notNull()
},t=>[index('idx_runs_project_created').on(t.projectId,t.createdAt)]);

export const mediaJobs=sqliteTable('media_jobs',{
 id:text('id').primaryKey(),projectId:text('project_id').notNull().references(()=>projects.id),
 status:text('status').notNull(),request:text('request').notNull(),outputs:text('outputs').notNull().default('[]'),
 attempt:integer('attempt').notNull().default(0),error:text('error'),createdAt:integer('created_at').notNull(),updatedAt:integer('updated_at').notNull()
},t=>[index('idx_media_jobs_project_created').on(t.projectId,t.createdAt)]);
export const conversations=sqliteTable('conversations',{
 id:text('id').primaryKey(),userId:text('user_id').notNull(),projectId:text('project_id').notNull().references(()=>projects.id),title:text('title').notNull(),draft:text('draft').notNull().default(''),archived:integer('archived').notNull().default(0),deleted:integer('deleted').notNull().default(0),manualTitle:integer('manual_title').notNull().default(0),summary:text('summary').notNull().default(''),summaryThrough:integer('summary_through').notNull().default(0),summaryMemoryRevision:integer('summary_memory_revision').notNull().default(0),createdAt:integer('created_at').notNull(),updatedAt:integer('updated_at').notNull()
},t=>[index('idx_conversations_user_updated').on(t.userId,t.updatedAt)]);
export const chatMessages=sqliteTable('chat_messages',{
 id:text('id').primaryKey(),conversationId:text('conversation_id').notNull().references(()=>conversations.id),role:text('role').notNull(),text:text('text').notNull().default(''),status:text('status').notNull(),attachments:text('attachments').notNull().default('[]'),tool:text('tool'),researchId:text('research_id'),embedding:text('embedding'),embeddingModel:text('embedding_model'),createdAt:integer('created_at').notNull(),updatedAt:integer('updated_at').notNull()
},t=>[index('idx_chat_messages_conversation_created').on(t.conversationId,t.createdAt)]);
export const profiles=sqliteTable('profiles',{
 userId:text('user_id').primaryKey(),name:text('name').notNull().default('Meu perfil'),avatarKey:text('avatar_key'),avatarMime:text('avatar_mime'),updatedAt:integer('updated_at').notNull()
});

export const researchSessions=sqliteTable('research_sessions',{
 id:text('id').primaryKey(),userId:text('user_id').notNull(),conversationId:text('conversation_id'),query:text('query').notNull(),mode:text('mode').notNull(),status:text('status').notNull(),answer:text('answer').notNull().default(''),report:text('report').notNull().default('{}'),error:text('error'),createdAt:integer('created_at').notNull(),updatedAt:integer('updated_at').notNull()
},t=>[index('idx_research_user_created').on(t.userId,t.createdAt)]);
export const researchSources=sqliteTable('research_sources',{
 id:text('id').primaryKey(),researchId:text('research_id').notNull().references(()=>researchSessions.id),url:text('url').notNull(),title:text('title').notNull(),domain:text('domain').notNull(),published:text('published'),retrievedAt:integer('retrieved_at').notNull(),score:integer('score').notNull(),contentHash:text('content_hash').notNull(),excerpt:text('excerpt').notNull(),metadata:text('metadata').notNull().default('{}')
},t=>[index('idx_sources_research').on(t.researchId)]);
export const researchClaims=sqliteTable('research_claims',{
 id:text('id').primaryKey(),researchId:text('research_id').notNull().references(()=>researchSessions.id),text:text('text').notNull(),status:text('status').notNull(),explanation:text('explanation').notNull().default('')
},t=>[index('idx_claims_research').on(t.researchId)]);
export const claimSources=sqliteTable('claim_sources',{
 id:text('id').primaryKey(),claimId:text('claim_id').notNull().references(()=>researchClaims.id),sourceId:text('source_id').notNull().references(()=>researchSources.id),evidence:text('evidence').notNull()
});
export const knowledgeJobs=sqliteTable('knowledge_jobs',{
 id:text('id').primaryKey(),userId:text('user_id').notNull(),conversationId:text('conversation_id'),kind:text('kind').notNull(),status:text('status').notNull(),error:text('error'),createdAt:integer('created_at').notNull(),updatedAt:integer('updated_at').notNull()
},t=>[index('idx_jobs_user_conversation').on(t.userId,t.conversationId)]);
export const researchCache=sqliteTable('research_cache',{
 id:text('id').primaryKey(),userId:text('user_id').notNull(),value:text('value').notNull(),expiresAt:integer('expires_at').notNull()
});
