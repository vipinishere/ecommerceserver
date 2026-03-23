import 'dotenv/config';
import { Command } from 'commander';
import { isEmail } from 'class-validator';
import { admin, categories, CategoryChildren } from './seeds';
import { PrismaClient } from '../src/generated/prisma/client';
import { specifications } from './seeds/categories-specification.seed';

const program = new Command();
program.option('--seed-only <name>', 'Specify a seed name').parse(process.argv);

const prisma = new PrismaClient();

async function main() {
  const options = program.opts();

  // Seed admin default credential
  if (!options.seedOnly || options.seedOnly === 'admin') {
    if (await prisma.admin.count()) {
      console.log('⚠ Skipping seed for `admin`, due to non-empty table');
    } else {
      if (
        isEmail(admin.email) &&
        admin.meta?.create?.passwordHash &&
        admin.meta.create.passwordSalt
      ) {
        await prisma.admin.create({
          data: admin,
        });
      } else {
        console.error(new Error('Invalid default admin credentials found'));
      }
    }
  }
  console.log('Seeding categories...');

  console.log('Checking for existing categories...');

  if ((await prisma.category.count()) > 0) {
    console.log(
      '⚠ Skipping seed for `category`, due to non-empty category table',
    );
  } else {
    for (const category of categories) {
      // Main category create
      const parent = await prisma.category.upsert({
        where: { id: category.name },
        update: {},
        create: {
          name: category.name,
          description: category.description,
        },
      });

      // Subcategories create
      for (const child of category.children as CategoryChildren[]) {
        await prisma.category.upsert({
          where: { id: child.name },
          update: {},
          create: {
            name: child.name,
            description: child.description,
            parentId: parent.id,
          },
        });
      }

      console.log(
        `✅ ${category.name} — ${(category.children as CategoryChildren[]).length} subcategories`,
      );
    }

    console.log('Seeding completed!');
  }

  console.log(
    'checking for category attributes, specification group and specification attributes',
  );

  if (
    (await prisma.specificationGroup.count()) > 0 &&
    (await prisma.specificationAttribute.count()) > 0 &&
    (await prisma.categoryAttribute.count()) > 0
  ) {
    console.log(
      '⚠ Skipping seed for `category attributes, specification group and specification attributes`, due to non-empty category table',
    );
  } else {
    for (const spec of specifications) {
      const category = await prisma.category.findFirst({
        where: { name: spec.category },
      });

      if (!category) {
        console.log(`Category not found: ${spec.category} — skip`);
        continue;
      }

      for (const group of spec.groups) {
        // SpecificationGroup create/find karo
        let specGroup = await prisma.specificationGroup.findFirst({
          where: { name: group.name },
        });

        if (!specGroup) {
          specGroup = await prisma.specificationGroup.create({
            data: {
              name: group.name,
              description: group.description,
            },
          });
        }
        console.log(`  Group: ${specGroup.name}`);
        for (const attr of group.attributes) {
          // SpecificationAttribute create/find karo
          let specAttr = await prisma.specificationAttribute.findFirst({
            where: {
              groupId: specGroup.id,
              name: attr.name,
            },
          });

          if (!specAttr) {
            specAttr = await prisma.specificationAttribute.create({
              data: {
                groupId: specGroup.id,
                name: attr.name,
                unit: attr.unit,
                dataType: attr.dataType,
              },
            });
          }

          // CategoryAttribute create karo
          await prisma.categoryAttribute.upsert({
            where: {
              categoryId_attributeId: {
                categoryId: category.id,
                attributeId: specAttr.id,
              },
            },
            create: {
              categoryId: category.id,
              attributeId: specAttr.id,
              isRequired: attr.isRequired,
            },
            update: {
              isRequired: attr.isRequired,
            },
          });

          console.log(`    Attribute: ${specAttr.name}`);
        }
      }

      console.log(`✅ ${spec.category} — specifications seeded`);
    }

    console.log('Specifications seeding completed!');
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
