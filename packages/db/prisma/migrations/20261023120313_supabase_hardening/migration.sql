-- Protect the public Supabase Data API. This application accesses data through
-- its backend (Prisma/JWT), not directly from browser clients.
DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'User','OAuthAccount','RefreshToken','EmailVerification','PasswordReset',
    'Subscription','Track','Module','Lesson','Quiz','Question','UserProgress',
    'LessonState','QuizAttempt','UserStreak','Design','DesignVersion','Template',
    'Simulation','SimulationRun','InterviewPrompt','InterviewSession','InterviewScore',
    'AIAnalysis','Blueprint','Comment','Vote','Collection','CollectionItem','Report',
    'FeatureFlag','AuditLog'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon, authenticated', table_name);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO anon, authenticated USING (false) WITH CHECK (false)',
      'deny_direct_api_' || lower(table_name),
      table_name
    );
  END LOOP;
END $$;

-- Cover foreign keys that are not otherwise the leading column of an index.
CREATE INDEX "AIAnalysis_designId_idx" ON "AIAnalysis"("designId");
CREATE INDEX "Blueprint_designId_idx" ON "Blueprint"("designId");
CREATE INDEX "CollectionItem_blueprintId_idx" ON "CollectionItem"("blueprintId");
CREATE INDEX "Comment_userId_idx" ON "Comment"("userId");
CREATE INDEX "InterviewSession_designId_idx" ON "InterviewSession"("designId");
CREATE INDEX "InterviewSession_promptId_idx" ON "InterviewSession"("promptId");
CREATE INDEX "LessonState_lessonId_idx" ON "LessonState"("lessonId");
CREATE INDEX "PasswordReset_userId_idx" ON "PasswordReset"("userId");
CREATE INDEX "QuizAttempt_quizId_idx" ON "QuizAttempt"("quizId");
CREATE INDEX "Report_blueprintId_idx" ON "Report"("blueprintId");
CREATE INDEX "Report_reporterId_idx" ON "Report"("reporterId");
CREATE INDEX "UserProgress_trackId_idx" ON "UserProgress"("trackId");
CREATE INDEX "Vote_userId_idx" ON "Vote"("userId");
