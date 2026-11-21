import { writeFileSync, mkdirSync } from "node:fs";
import { exercises } from "../src/lib/catalog";
mkdirSync("supabase", { recursive: true });
const quote = (s: string) => "'" + s.replaceAll("'", "''") + "'";
writeFileSync(
  "supabase/seed.sql",
  "-- Original FitForge exercise catalogue; generated with npm run seed.\n" +
    exercises
      .map(
        (e) =>
          `insert into public.exercises (id,name,primary_muscle,equipment,guide) values (${quote(e.id)},${quote(e.name)},${quote(e.primary)},ARRAY[${e.gear.map(quote).join(",")}]::text[],${quote(JSON.stringify(e))}::jsonb) on conflict (id) do update set name=excluded.name,primary_muscle=excluded.primary_muscle,equipment=excluded.equipment,guide=excluded.guide;`,
      )
      .join("\n"),
);
