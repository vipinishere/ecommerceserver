import 'dotenv/config';
import { Command } from 'commander';
import { isEmail } from 'class-validator';
import { admin, categories, CategoryChildren } from './seeds';
import { DataType, PrismaClient } from '../src/generated/prisma/client';
// import { specifications } from './seeds/categories-specification.seed';

const specifications = [
  // ELECTRONICS — MOBILES & SMARTPHONES
  {
    category: 'Mobiles & Smartphones',
    groups: [
      {
        name: 'Display',
        description: 'Screen related specifications',
        attributes: [
          {
            name: 'Screen Size',
            unit: 'inches',
            dataType: DataType.NUMBER,
            isRequired: true,
          },
          {
            name: 'Resolution',
            unit: null,
            dataType: DataType.TEXT,
            isRequired: true,
          },
          {
            name: 'Display Type',
            unit: null,
            dataType: DataType.TEXT,
            isRequired: true,
          },
          {
            name: 'Refresh Rate',
            unit: 'Hz',
            dataType: DataType.NUMBER,
            isRequired: false,
          },
          {
            name: 'Brightness',
            unit: 'nits',
            dataType: DataType.NUMBER,
            isRequired: false,
          },
        ],
      },
      {
        name: 'Performance',
        description: 'Processor and memory specifications',
        attributes: [
          {
            name: 'Processor',
            unit: null,
            dataType: DataType.TEXT,
            isRequired: true,
          },
          {
            name: 'RAM',
            unit: 'GB',
            dataType: DataType.NUMBER,
            isRequired: true,
          },
          {
            name: 'Storage',
            unit: 'GB',
            dataType: DataType.NUMBER,
            isRequired: true,
          },
          {
            name: 'Expandable Storage',
            unit: null,
            dataType: DataType.BOOLEAN,
            isRequired: false,
          },
        ],
      },
      {
        name: 'Camera',
        description: 'Camera specifications',
        attributes: [
          {
            name: 'Rear Camera',
            unit: 'MP',
            dataType: DataType.NUMBER,
            isRequired: true,
          },
          {
            name: 'Front Camera',
            unit: 'MP',
            dataType: DataType.NUMBER,
            isRequired: true,
          },
          {
            name: 'Video Recording',
            unit: null,
            dataType: DataType.TEXT,
            isRequired: false,
          },
          {
            name: 'OIS',
            unit: null,
            dataType: DataType.BOOLEAN,
            isRequired: false,
          },
        ],
      },
      {
        name: 'Battery',
        description: 'Battery specifications',
        attributes: [
          {
            name: 'Battery Capacity',
            unit: 'mAh',
            dataType: DataType.NUMBER,
            isRequired: true,
          },
          {
            name: 'Fast Charging',
            unit: 'W',
            dataType: DataType.NUMBER,
            isRequired: false,
          },
          {
            name: 'Wireless Charging',
            unit: null,
            dataType: DataType.BOOLEAN,
            isRequired: false,
          },
        ],
      },
      {
        name: 'Connectivity',
        description: 'Network and connectivity',
        attributes: [
          {
            name: 'Network',
            unit: null,
            dataType: DataType.TEXT,
            isRequired: true,
          },
          {
            name: 'WiFi',
            unit: null,
            dataType: DataType.TEXT,
            isRequired: false,
          },
          {
            name: 'Bluetooth',
            unit: null,
            dataType: DataType.TEXT,
            isRequired: false,
          },
          {
            name: 'NFC',
            unit: null,
            dataType: DataType.BOOLEAN,
            isRequired: false,
          },
          {
            name: 'USB Type',
            unit: null,
            dataType: DataType.TEXT,
            isRequired: false,
          },
        ],
      },
    ],
  },

  // ELECTRONICS — LAPTOPS
  {
    category: 'Laptops',
    groups: [
      {
        name: 'Performance',
        description: 'Processor and memory',
        attributes: [
          {
            name: 'Processor',
            unit: null,
            dataType: DataType.TEXT,
            isRequired: true,
          },
          {
            name: 'Processor Generation',
            unit: null,
            dataType: DataType.TEXT,
            isRequired: true,
          },
          {
            name: 'RAM',
            unit: 'GB',
            dataType: DataType.NUMBER,
            isRequired: true,
          },
          {
            name: 'RAM Type',
            unit: null,
            dataType: DataType.TEXT,
            isRequired: false,
          },
          {
            name: 'Storage',
            unit: 'GB',
            dataType: DataType.NUMBER,
            isRequired: true,
          },
          {
            name: 'Storage Type',
            unit: null,
            dataType: DataType.TEXT,
            isRequired: true,
          },
        ],
      },
      {
        name: 'Display',
        description: 'Screen specifications',
        attributes: [
          {
            name: 'Screen Size',
            unit: 'inches',
            dataType: DataType.NUMBER,
            isRequired: true,
          },
          {
            name: 'Resolution',
            unit: null,
            dataType: DataType.TEXT,
            isRequired: true,
          },
          {
            name: 'Display Type',
            unit: null,
            dataType: DataType.TEXT,
            isRequired: false,
          },
          {
            name: 'Refresh Rate',
            unit: 'Hz',
            dataType: DataType.NUMBER,
            isRequired: false,
          },
          {
            name: 'Touchscreen',
            unit: null,
            dataType: DataType.BOOLEAN,
            isRequired: false,
          },
        ],
      },
      {
        name: 'Graphics',
        description: 'GPU specifications',
        attributes: [
          {
            name: 'Graphics Card',
            unit: null,
            dataType: DataType.TEXT,
            isRequired: true,
          },
          {
            name: 'Graphics Memory',
            unit: 'GB',
            dataType: DataType.NUMBER,
            isRequired: false,
          },
        ],
      },
      {
        name: 'Battery',
        description: 'Battery and charging',
        attributes: [
          {
            name: 'Battery Capacity',
            unit: 'Wh',
            dataType: DataType.NUMBER,
            isRequired: false,
          },
          {
            name: 'Battery Life',
            unit: 'hours',
            dataType: DataType.NUMBER,
            isRequired: false,
          },
        ],
      },
      {
        name: 'Build',
        description: 'Physical specifications',
        attributes: [
          {
            name: 'Weight',
            unit: 'kg',
            dataType: DataType.NUMBER,
            isRequired: true,
          },
          {
            name: 'Operating System',
            unit: null,
            dataType: DataType.TEXT,
            isRequired: true,
          },
          {
            name: 'Backlit Keyboard',
            unit: null,
            dataType: DataType.BOOLEAN,
            isRequired: false,
          },
        ],
      },
    ],
  },

  // ELECTRONICS — TABLETS
  {
    category: 'Tablets',
    groups: [
      {
        name: 'Display',
        description: 'Screen specifications',
        attributes: [
          {
            name: 'Screen Size',
            unit: 'inches',
            dataType: DataType.NUMBER,
            isRequired: true,
          },
          {
            name: 'Resolution',
            unit: null,
            dataType: DataType.TEXT,
            isRequired: true,
          },
          {
            name: 'Display Type',
            unit: null,
            dataType: DataType.TEXT,
            isRequired: false,
          },
        ],
      },
      {
        name: 'Performance',
        description: 'Processor and memory',
        attributes: [
          {
            name: 'Processor',
            unit: null,
            dataType: DataType.TEXT,
            isRequired: true,
          },
          {
            name: 'RAM',
            unit: 'GB',
            dataType: DataType.NUMBER,
            isRequired: true,
          },
          {
            name: 'Storage',
            unit: 'GB',
            dataType: DataType.NUMBER,
            isRequired: true,
          },
        ],
      },
      {
        name: 'Battery',
        description: 'Battery specifications',
        attributes: [
          {
            name: 'Battery Capacity',
            unit: 'mAh',
            dataType: DataType.NUMBER,
            isRequired: true,
          },
          {
            name: 'Fast Charging',
            unit: null,
            dataType: DataType.BOOLEAN,
            isRequired: false,
          },
        ],
      },
      {
        name: 'Connectivity',
        description: 'Network and connectivity',
        attributes: [
          {
            name: 'SIM Support',
            unit: null,
            dataType: DataType.BOOLEAN,
            isRequired: true,
          },
          {
            name: 'WiFi',
            unit: null,
            dataType: DataType.TEXT,
            isRequired: true,
          },
          {
            name: 'Bluetooth',
            unit: null,
            dataType: DataType.TEXT,
            isRequired: false,
          },
        ],
      },
    ],
  },

  // ELECTRONICS — CAMERAS
  {
    category: 'Cameras',
    groups: [
      {
        name: 'Camera',
        description: 'Camera specifications',
        attributes: [
          {
            name: 'Camera Type',
            unit: null,
            dataType: DataType.TEXT,
            isRequired: true,
          },
          {
            name: 'Megapixels',
            unit: 'MP',
            dataType: DataType.NUMBER,
            isRequired: true,
          },
          {
            name: 'Sensor Size',
            unit: null,
            dataType: DataType.TEXT,
            isRequired: false,
          },
          {
            name: 'ISO Range',
            unit: null,
            dataType: DataType.TEXT,
            isRequired: false,
          },
          {
            name: 'Video Resolution',
            unit: null,
            dataType: DataType.TEXT,
            isRequired: false,
          },
        ],
      },
      {
        name: 'Lens',
        description: 'Lens specifications',
        attributes: [
          {
            name: 'Lens Mount',
            unit: null,
            dataType: DataType.TEXT,
            isRequired: true,
          },
          {
            name: 'Focal Length',
            unit: 'mm',
            dataType: DataType.TEXT,
            isRequired: false,
          },
          {
            name: 'Aperture',
            unit: null,
            dataType: DataType.TEXT,
            isRequired: false,
          },
        ],
      },
      {
        name: 'Build',
        description: 'Physical specifications',
        attributes: [
          {
            name: 'Weight',
            unit: 'g',
            dataType: DataType.NUMBER,
            isRequired: false,
          },
          {
            name: 'Weather Sealed',
            unit: null,
            dataType: DataType.BOOLEAN,
            isRequired: false,
          },
          {
            name: 'Battery Life',
            unit: 'shots',
            dataType: DataType.NUMBER,
            isRequired: false,
          },
        ],
      },
    ],
  },

  // ELECTRONICS — TVs & HOME THEATRE
  {
    category: 'TVs & Home Theatre',
    groups: [
      {
        name: 'Display',
        description: 'Screen specifications',
        attributes: [
          {
            name: 'Screen Size',
            unit: 'inches',
            dataType: DataType.NUMBER,
            isRequired: true,
          },
          {
            name: 'Resolution',
            unit: null,
            dataType: DataType.TEXT,
            isRequired: true,
          },
          {
            name: 'Display Technology',
            unit: null,
            dataType: DataType.TEXT,
            isRequired: true,
          },
          {
            name: 'Refresh Rate',
            unit: 'Hz',
            dataType: DataType.NUMBER,
            isRequired: false,
          },
          {
            name: 'HDR Support',
            unit: null,
            dataType: DataType.BOOLEAN,
            isRequired: false,
          },
        ],
      },
      {
        name: 'Smart Features',
        description: 'Smart TV features',
        attributes: [
          {
            name: 'Operating System',
            unit: null,
            dataType: DataType.TEXT,
            isRequired: true,
          },
          {
            name: 'Voice Assistant',
            unit: null,
            dataType: DataType.TEXT,
            isRequired: false,
          },
          {
            name: 'Screen Mirroring',
            unit: null,
            dataType: DataType.BOOLEAN,
            isRequired: false,
          },
        ],
      },
      {
        name: 'Connectivity',
        description: 'Ports and connectivity',
        attributes: [
          {
            name: 'HDMI Ports',
            unit: null,
            dataType: DataType.NUMBER,
            isRequired: false,
          },
          {
            name: 'USB Ports',
            unit: null,
            dataType: DataType.NUMBER,
            isRequired: false,
          },
          {
            name: 'WiFi',
            unit: null,
            dataType: DataType.BOOLEAN,
            isRequired: false,
          },
          {
            name: 'Bluetooth',
            unit: null,
            dataType: DataType.BOOLEAN,
            isRequired: false,
          },
        ],
      },
    ],
  },

  // FASHION — MEN'S CLOTHING
  {
    category: "Men's Clothing",
    groups: [
      {
        name: 'Size & Fit',
        description: 'Size and fit information',
        attributes: [
          {
            name: 'Size',
            unit: null,
            dataType: DataType.TEXT,
            isRequired: true,
          },
          {
            name: 'Fit Type',
            unit: null,
            dataType: DataType.TEXT,
            isRequired: true,
          },
          {
            name: 'Chest',
            unit: 'inches',
            dataType: DataType.NUMBER,
            isRequired: false,
          },
          {
            name: 'Waist',
            unit: 'inches',
            dataType: DataType.NUMBER,
            isRequired: false,
          },
        ],
      },
      {
        name: 'Material',
        description: 'Fabric and material',
        attributes: [
          {
            name: 'Fabric',
            unit: null,
            dataType: DataType.TEXT,
            isRequired: true,
          },
          {
            name: 'Fabric Composition',
            unit: null,
            dataType: DataType.TEXT,
            isRequired: false,
          },
          {
            name: 'Stretchable',
            unit: null,
            dataType: DataType.BOOLEAN,
            isRequired: false,
          },
        ],
      },
      {
        name: 'Care Instructions',
        description: 'Washing and care',
        attributes: [
          {
            name: 'Wash Care',
            unit: null,
            dataType: DataType.TEXT,
            isRequired: false,
          },
          {
            name: 'Dry Clean Only',
            unit: null,
            dataType: DataType.BOOLEAN,
            isRequired: false,
          },
        ],
      },
    ],
  },

  // FASHION — WOMEN'S CLOTHING
  {
    category: "Women's Clothing",
    groups: [
      {
        name: 'Size & Fit',
        description: 'Size and fit information',
        attributes: [
          {
            name: 'Size',
            unit: null,
            dataType: DataType.TEXT,
            isRequired: true,
          },
          {
            name: 'Fit Type',
            unit: null,
            dataType: DataType.TEXT,
            isRequired: true,
          },
          {
            name: 'Length',
            unit: null,
            dataType: DataType.TEXT,
            isRequired: false,
          },
        ],
      },
      {
        name: 'Material',
        description: 'Fabric and material',
        attributes: [
          {
            name: 'Fabric',
            unit: null,
            dataType: DataType.TEXT,
            isRequired: true,
          },
          {
            name: 'Fabric Composition',
            unit: null,
            dataType: DataType.TEXT,
            isRequired: false,
          },
          {
            name: 'Stretchable',
            unit: null,
            dataType: DataType.BOOLEAN,
            isRequired: false,
          },
        ],
      },
      {
        name: 'Care Instructions',
        description: 'Washing and care',
        attributes: [
          {
            name: 'Wash Care',
            unit: null,
            dataType: DataType.TEXT,
            isRequired: false,
          },
          {
            name: 'Dry Clean Only',
            unit: null,
            dataType: DataType.BOOLEAN,
            isRequired: false,
          },
        ],
      },
    ],
  },

  // FASHION — FOOTWEAR
  {
    category: 'Footwear',
    groups: [
      {
        name: 'Size & Fit',
        description: 'Size information',
        attributes: [
          {
            name: 'UK Size',
            unit: null,
            dataType: DataType.NUMBER,
            isRequired: true,
          },
          {
            name: 'Sole Material',
            unit: null,
            dataType: DataType.TEXT,
            isRequired: false,
          },
          {
            name: 'Closure Type',
            unit: null,
            dataType: DataType.TEXT,
            isRequired: false,
          },
        ],
      },
      {
        name: 'Material',
        description: 'Upper material',
        attributes: [
          {
            name: 'Upper Material',
            unit: null,
            dataType: DataType.TEXT,
            isRequired: true,
          },
          {
            name: 'Water Resistant',
            unit: null,
            dataType: DataType.BOOLEAN,
            isRequired: false,
          },
        ],
      },
    ],
  },

  // HOME & KITCHEN — KITCHEN APPLIANCES
  {
    category: 'Kitchen Appliances',
    groups: [
      {
        name: 'General',
        description: 'General specifications',
        attributes: [
          {
            name: 'Wattage',
            unit: 'W',
            dataType: DataType.NUMBER,
            isRequired: true,
          },
          {
            name: 'Voltage',
            unit: 'V',
            dataType: DataType.TEXT,
            isRequired: false,
          },
          {
            name: 'Capacity',
            unit: 'L',
            dataType: DataType.NUMBER,
            isRequired: false,
          },
          {
            name: 'Material',
            unit: null,
            dataType: DataType.TEXT,
            isRequired: false,
          },
        ],
      },
      {
        name: 'Features',
        description: 'Special features',
        attributes: [
          {
            name: 'Auto Shut Off',
            unit: null,
            dataType: DataType.BOOLEAN,
            isRequired: false,
          },
          {
            name: 'Timer',
            unit: null,
            dataType: DataType.BOOLEAN,
            isRequired: false,
          },
          {
            name: 'Child Lock',
            unit: null,
            dataType: DataType.BOOLEAN,
            isRequired: false,
          },
        ],
      },
      {
        name: 'Warranty',
        description: 'Warranty information',
        attributes: [
          {
            name: 'Warranty',
            unit: 'years',
            dataType: DataType.NUMBER,
            isRequired: true,
          },
        ],
      },
    ],
  },

  // HOME & KITCHEN — FURNITURE
  {
    category: 'Furniture',
    groups: [
      {
        name: 'Dimensions',
        description: 'Physical dimensions',
        attributes: [
          {
            name: 'Width',
            unit: 'cm',
            dataType: DataType.NUMBER,
            isRequired: true,
          },
          {
            name: 'Height',
            unit: 'cm',
            dataType: DataType.NUMBER,
            isRequired: true,
          },
          {
            name: 'Depth',
            unit: 'cm',
            dataType: DataType.NUMBER,
            isRequired: true,
          },
          {
            name: 'Weight Capacity',
            unit: 'kg',
            dataType: DataType.NUMBER,
            isRequired: false,
          },
        ],
      },
      {
        name: 'Material',
        description: 'Build material',
        attributes: [
          {
            name: 'Primary Material',
            unit: null,
            dataType: DataType.TEXT,
            isRequired: true,
          },
          {
            name: 'Finish',
            unit: null,
            dataType: DataType.TEXT,
            isRequired: false,
          },
          {
            name: 'Assembly Required',
            unit: null,
            dataType: DataType.BOOLEAN,
            isRequired: true,
          },
        ],
      },
      {
        name: 'Warranty',
        description: 'Warranty information',
        attributes: [
          {
            name: 'Warranty',
            unit: 'years',
            dataType: DataType.NUMBER,
            isRequired: true,
          },
        ],
      },
    ],
  },

  // SPORTS & FITNESS — EXERCISE & FITNESS
  {
    category: 'Exercise & Fitness',
    groups: [
      {
        name: 'General',
        description: 'General specifications',
        attributes: [
          {
            name: 'Weight',
            unit: 'kg',
            dataType: DataType.NUMBER,
            isRequired: false,
          },
          {
            name: 'Material',
            unit: null,
            dataType: DataType.TEXT,
            isRequired: true,
          },
          {
            name: 'Max User Weight',
            unit: 'kg',
            dataType: DataType.NUMBER,
            isRequired: false,
          },
        ],
      },
      {
        name: 'Dimensions',
        description: 'Physical dimensions',
        attributes: [
          {
            name: 'Length',
            unit: 'cm',
            dataType: DataType.NUMBER,
            isRequired: false,
          },
          {
            name: 'Width',
            unit: 'cm',
            dataType: DataType.NUMBER,
            isRequired: false,
          },
          {
            name: 'Foldable',
            unit: null,
            dataType: DataType.BOOLEAN,
            isRequired: false,
          },
        ],
      },
    ],
  },

  // HEALTH & WELLNESS — MEDICAL DEVICES
  {
    category: 'Medical Devices',
    groups: [
      {
        name: 'General',
        description: 'General specifications',
        attributes: [
          {
            name: 'Measurement Range',
            unit: null,
            dataType: DataType.TEXT,
            isRequired: true,
          },
          {
            name: 'Accuracy',
            unit: null,
            dataType: DataType.TEXT,
            isRequired: true,
          },
          {
            name: 'Memory',
            unit: 'readings',
            dataType: DataType.NUMBER,
            isRequired: false,
          },
          {
            name: 'Battery Type',
            unit: null,
            dataType: DataType.TEXT,
            isRequired: false,
          },
        ],
      },
      {
        name: 'Certifications',
        description: 'Medical certifications',
        attributes: [
          {
            name: 'FDA Approved',
            unit: null,
            dataType: DataType.BOOLEAN,
            isRequired: false,
          },
          {
            name: 'CE Certified',
            unit: null,
            dataType: DataType.BOOLEAN,
            isRequired: false,
          },
        ],
      },
      {
        name: 'Warranty',
        description: 'Warranty information',
        attributes: [
          {
            name: 'Warranty',
            unit: 'years',
            dataType: DataType.NUMBER,
            isRequired: true,
          },
        ],
      },
    ],
  },

  // AUTOMOTIVE — CAR ACCESSORIES
  {
    category: 'Car Accessories',
    groups: [
      {
        name: 'Compatibility',
        description: 'Vehicle compatibility',
        attributes: [
          {
            name: 'Compatible Cars',
            unit: null,
            dataType: DataType.TEXT,
            isRequired: true,
          },
          {
            name: 'Universal Fit',
            unit: null,
            dataType: DataType.BOOLEAN,
            isRequired: true,
          },
        ],
      },
      {
        name: 'General',
        description: 'General specifications',
        attributes: [
          {
            name: 'Material',
            unit: null,
            dataType: DataType.TEXT,
            isRequired: true,
          },
          {
            name: 'Warranty',
            unit: 'months',
            dataType: DataType.NUMBER,
            isRequired: false,
          },
        ],
      },
    ],
  },

  // BOOKS
  {
    category: 'Fiction',
    groups: [
      {
        name: 'Book Details',
        description: 'Book information',
        attributes: [
          {
            name: 'Author',
            unit: null,
            dataType: DataType.TEXT,
            isRequired: true,
          },
          {
            name: 'Publisher',
            unit: null,
            dataType: DataType.TEXT,
            isRequired: true,
          },
          {
            name: 'Pages',
            unit: null,
            dataType: DataType.NUMBER,
            isRequired: false,
          },
          {
            name: 'Language',
            unit: null,
            dataType: DataType.TEXT,
            isRequired: true,
          },
          {
            name: 'Edition',
            unit: null,
            dataType: DataType.TEXT,
            isRequired: false,
          },
          {
            name: 'ISBN',
            unit: null,
            dataType: DataType.TEXT,
            isRequired: false,
          },
        ],
      },
    ],
  },
  {
    category: 'Non-Fiction',
    groups: [
      {
        name: 'Book Details',
        description: 'Book information',
        attributes: [
          {
            name: 'Author',
            unit: null,
            dataType: DataType.TEXT,
            isRequired: true,
          },
          {
            name: 'Publisher',
            unit: null,
            dataType: DataType.TEXT,
            isRequired: true,
          },
          {
            name: 'Pages',
            unit: null,
            dataType: DataType.NUMBER,
            isRequired: false,
          },
          {
            name: 'Language',
            unit: null,
            dataType: DataType.TEXT,
            isRequired: true,
          },
          {
            name: 'Edition',
            unit: null,
            dataType: DataType.TEXT,
            isRequired: false,
          },
          {
            name: 'ISBN',
            unit: null,
            dataType: DataType.TEXT,
            isRequired: false,
          },
        ],
      },
    ],
  },
];

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

  if (!options.seedOnly || options.seedOnly === 'category') {
    console.log('Seeding categories...');
    console.log('Checking for existing categories...');

    if ((await prisma.category.count()) > 0) {
      console.log(
        '⚠ Skipping seed for `category`, due to non-empty category table',
      );
    } else {
      for (const category of categories) {
        // Main category create
        let parent = await prisma.category.findFirst({
          where: { name: category.name },
        });

        if (!parent) {
          parent = await prisma.category.create({
            data: {
              name: category.name,
              description: category.description,
            },
          });
        }

        // Subcategories create
        for (const child of category.children as CategoryChildren[]) {
          const existing = await prisma.category.findFirst({
            where: { name: child.name },
          });

          if (!existing) {
            await prisma.category.create({
              data: {
                name: child.name,
                description: child.description,
                parentId: parent.id,
              },
            });
          }
        }

        console.log(
          `✅ ${category.name} — ${(category.children as CategoryChildren[]).length} subcategories`,
        );
      }

      console.log('Seeding completed!');
    }
  }

  if (!options.seedOnly || options.seedOnly === 'specification') {
    console.log(
      'checking for category attributes, specification group and specification attributes',
    );

    if (
      (await prisma.specificationGroup.count()) > 0 ||
      (await prisma.specificationAttribute.count()) > 0 ||
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
