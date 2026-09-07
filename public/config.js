/* ============================================================
   Ardoise — le seul fichier à remplir avant la mise en ligne
   ------------------------------------------------------------
   Supabase → Project Settings → API :
     SB_URL = « Project URL »
     SB_KEY = clé « anon » / « public »  —  JAMAIS la service_role,
              qui contourne toute la RLS et donnerait accès à
              l'ensemble de la base depuis le navigateur.

   La clé anon est publique par construction : elle part dans le
   code de la page. C'est la RLS, dans supabase/schema.sql, qui
   protège les données — pas le secret de cette clé.
   ============================================================ */

window.ARDOISE_CONFIG = {
  SB_URL: "https://rbjegjctaqynnmnuxuee.supabase.co",
  SB_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiamVnamN0YXF5bm5tbnV4dWVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg3NjEwNjcsImV4cCI6MjEwNDMzNzA2N30.djs8FK8Bg-t4CvTd2W0qLTHNM9GAvnzrPkRewobjoMI"
};
