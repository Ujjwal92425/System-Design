const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const db = new PrismaClient();

async function main() {
  console.log('🌱 Reading scenario templates from frontend...');
  const scenariosPath = path.join(__dirname, '../../../apps/frontend/data/scenarios/index.ts');
  let content = fs.readFileSync(scenariosPath, 'utf8');

  // Strip TypeScript interfaces and exports to evaluate as JS
  // We locate the start of SCENARIO_TEMPLATES array
  const arrayStartIndex = content.indexOf('export const SCENARIO_TEMPLATES');
  if (arrayStartIndex === -1) {
    throw new Error('Could not find SCENARIO_TEMPLATES in the file');
  }

  let arrayContent = content.substring(arrayStartIndex);
  // Replace the export with a plain JS definition
  arrayContent = arrayContent.replace('export const SCENARIO_TEMPLATES: ScenarioTemplate[] =', 'const SCENARIO_TEMPLATES =');
  
  // Create a temporary JS content to evaluate
  const jsCode = `${arrayContent}\nmodule.exports = SCENARIO_TEMPLATES;`;
  
  // Evaluate the JS code safely to get the array
  const Module = module.constructor;
  const tempModule = new Module();
  tempModule._compile(jsCode, 'temp-scenarios.js');
  const scenarioTemplates = tempModule.exports;

  console.log(`✅ Loaded ${scenarioTemplates.length} scenario templates from frontend.`);

  console.log('🌱 Seeding templates into database...');
  for (const t of scenarioTemplates) {
    // We transform scale or other properties if needed. The Template model has:
    // id, name, description, category, difficulty, nodes, edges, tags, isPublished
    const tags = t.scale ? [t.scale] : [];
    
    await db.template.upsert({
      where: { id: t.id },
      update: {
        name: t.name,
        description: t.description,
        category: t.category,
        difficulty: t.difficulty,
        nodes: t.nodes,
        edges: t.edges,
        tags: tags,
        isPublished: true,
      },
      create: {
        id: t.id,
        name: t.name,
        description: t.description,
        category: t.category,
        difficulty: t.difficulty,
        nodes: t.nodes,
        edges: t.edges,
        tags: tags,
        isPublished: true,
      }
    });
    console.log(`   - Seeded template: ${t.name} (${t.id})`);
  }

  console.log('✨ Scenario templates seeding complete!');
}

main()
  .catch(err => {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
