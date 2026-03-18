// import { CategoryModel } from '../../src/generated/prisma/models/Category';

export type Category = {
  name: string;
  description: string;
  children?: CategoryChildren[];
};
export type CategoryChildren = {
  name: string;
  description: string;
};

export const categories: Category[] = [
  {
    name: 'Electronics',
    description: 'Electronic devices and accessories',
    children: [
      { name: 'Mobiles & Smartphones', description: 'All mobile phones' },
      { name: 'Laptops', description: 'Laptops and notebooks' },
      { name: 'Tablets', description: 'Tablets and iPads' },
      {
        name: 'Cameras',
        description: 'DSLR, mirrorless and digital cameras',
      },
      {
        name: 'Headphones & Earphones',
        description: 'Wired and wireless audio',
      },
      {
        name: 'Smart Watches',
        description: 'Smartwatches and fitness bands',
      },
      {
        name: 'TVs & Home Theatre',
        description: 'Televisions and home theatre systems',
      },
      {
        name: 'Printers & Scanners',
        description: 'Printers, scanners and ink',
      },
      {
        name: 'Computer Accessories',
        description: 'Mouse, keyboard, monitors etc.',
      },
      {
        name: 'Gaming',
        description: 'Gaming consoles, games and accessories',
      },
    ],
  },
  {
    name: 'Fashion',
    description: 'Clothing, footwear and accessories',
    children: [
      {
        name: "Men's Clothing",
        description: 'Shirts, trousers, jackets for men',
      },
      {
        name: "Women's Clothing",
        description: 'Tops, sarees, dresses for women',
      },
      {
        name: "Kids' Clothing",
        description: 'Clothing for boys and girls',
      },
      { name: 'Footwear', description: 'Shoes, sandals and boots' },
      { name: 'Watches', description: 'Analog and digital watches' },
      {
        name: 'Sunglasses',
        description: 'Fashion and UV protection sunglasses',
      },
      {
        name: 'Bags & Wallets',
        description: 'Handbags, backpacks and wallets',
      },
      { name: 'Jewellery', description: 'Necklaces, rings and earrings' },
      { name: 'Sportswear', description: 'Athletic and sports clothing' },
    ],
  },
  {
    name: 'Home & Kitchen',
    description: 'Home decor, kitchen appliances and furniture',
    children: [
      {
        name: 'Kitchen Appliances',
        description: 'Mixers, microwaves, ovens etc.',
      },
      { name: 'Cookware', description: 'Pots, pans and cooking utensils' },
      {
        name: 'Home Decor',
        description: 'Curtains, rugs and decorative items',
      },
      { name: 'Furniture', description: 'Sofas, beds, tables and chairs' },
      {
        name: 'Bedding & Pillows',
        description: 'Bed sheets, pillows and covers',
      },
      {
        name: 'Cleaning Supplies',
        description: 'Cleaning tools and products',
      },
      {
        name: 'Storage & Organisation',
        description: 'Boxes, racks and organisers',
      },
      { name: 'Lighting', description: 'Bulbs, lamps and ceiling lights' },
    ],
  },
  {
    name: 'Beauty & Personal Care',
    description: 'Skincare, haircare and grooming products',
    children: [
      {
        name: 'Skincare',
        description: 'Face wash, moisturiser and serums',
      },
      {
        name: 'Haircare',
        description: 'Shampoo, conditioner and hair oils',
      },
      { name: 'Makeup', description: 'Foundation, lipstick and eyeshadow' },
      { name: 'Fragrances', description: 'Perfumes and deodorants' },
      {
        name: "Men's Grooming",
        description: 'Shaving, beard care and grooming',
      },
      { name: 'Bath & Body', description: 'Body wash, scrubs and lotions' },
      {
        name: 'Oral Care',
        description: 'Toothbrush, toothpaste and mouthwash',
      },
    ],
  },
  {
    name: 'Books',
    description: 'Books across all genres',
    children: [
      { name: 'Fiction', description: 'Novels and short stories' },
      {
        name: 'Non-Fiction',
        description: 'Biographies, self-help and history',
      },
      {
        name: 'Academic & Textbooks',
        description: 'School and college textbooks',
      },
      {
        name: 'Children Books',
        description: 'Story books and activity books',
      },
      {
        name: 'Comics & Manga',
        description: 'Comics and manga collections',
      },
      {
        name: 'Business & Finance',
        description: 'Business, economics and finance books',
      },
    ],
  },
  {
    name: 'Sports & Fitness',
    description: 'Sports equipment and fitness accessories',
    children: [
      {
        name: 'Exercise & Fitness',
        description: 'Dumbbells, yoga mats and resistance bands',
      },
      { name: 'Cricket', description: 'Bats, balls and cricket gear' },
      { name: 'Football', description: 'Footballs and football gear' },
      { name: 'Badminton', description: 'Rackets, shuttlecocks and nets' },
      { name: 'Cycling', description: 'Cycles, helmets and accessories' },
      {
        name: 'Swimming',
        description: 'Swimwear and swimming accessories',
      },
      {
        name: 'Outdoor & Adventure',
        description: 'Camping, trekking and hiking gear',
      },
    ],
  },
  {
    name: 'Toys & Baby Products',
    description: 'Toys, games and baby care products',
    children: [
      {
        name: 'Baby Care',
        description: 'Diapers, feeding bottles and baby food',
      },
      {
        name: 'Educational Toys',
        description: 'Learning and educational toys',
      },
      {
        name: 'Action Figures',
        description: 'Superhero and character figures',
      },
      {
        name: 'Board Games',
        description: 'Family and strategy board games',
      },
      {
        name: 'Remote Control Toys',
        description: 'RC cars, drones and helicopters',
      },
      { name: 'Soft Toys', description: 'Stuffed animals and plush toys' },
    ],
  },
  {
    name: 'Grocery & Food',
    description: 'Fresh and packaged food items',
    children: [
      {
        name: 'Fresh Fruits & Vegetables',
        description: 'Fresh produce delivered daily',
      },
      {
        name: 'Snacks & Beverages',
        description: 'Chips, juices and soft drinks',
      },
      {
        name: 'Dairy & Eggs',
        description: 'Milk, cheese, butter and eggs',
      },
      { name: 'Bakery', description: 'Breads, cakes and pastries' },
      {
        name: 'Organic & Natural',
        description: 'Organic and natural food products',
      },
      {
        name: 'Spices & Condiments',
        description: 'Spices, sauces and condiments',
      },
    ],
  },
  {
    name: 'Automotive',
    description: 'Car and bike accessories',
    children: [
      {
        name: 'Car Accessories',
        description: 'Car covers, seat covers and more',
      },
      {
        name: 'Bike Accessories',
        description: 'Helmets, locks and bike covers',
      },
      {
        name: 'Car Electronics',
        description: 'GPS, dash cams and car chargers',
      },
      {
        name: 'Tyres & Wheels',
        description: 'Tyres, alloys and wheel covers',
      },
      {
        name: 'Car Care',
        description: 'Car wash, wax and cleaning products',
      },
    ],
  },
  {
    name: 'Health & Wellness',
    description: 'Health supplements and medical devices',
    children: [
      {
        name: 'Vitamins & Supplements',
        description: 'Multivitamins and health supplements',
      },
      {
        name: 'Medical Devices',
        description: 'BP monitors, glucometers and thermometers',
      },
      {
        name: 'Protein & Fitness Nutrition',
        description: 'Whey protein and energy bars',
      },
      {
        name: 'Ayurvedic & Herbal',
        description: 'Ayurvedic and herbal products',
      },
      {
        name: 'Personal Safety',
        description: 'Masks, sanitizers and safety gear',
      },
    ],
  },
];
