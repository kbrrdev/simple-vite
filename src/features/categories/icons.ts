import {
  AppleIcon,
  BabyIcon,
  BackpackIcon,
  BedIcon,
  BikeIcon,
  BookOpenIcon,
  CakeIcon,
  CameraIcon,
  CarIcon,
  CarrotIcon,
  CatIcon,
  CoffeeIcon,
  DogIcon,
  DumbbellIcon,
  Flower2Icon,
  FootprintsIcon,
  Gamepad2Icon,
  GemIcon,
  GiftIcon,
  GlassesIcon,
  HammerIcon,
  HeadphonesIcon,
  HeartPulseIcon,
  HouseIcon,
  LampIcon,
  LaptopIcon,
  LeafIcon,
  MusicIcon,
  PackageIcon,
  PaletteIcon,
  PillIcon,
  ScissorsIcon,
  ShirtIcon,
  ShoppingBagIcon,
  SmartphoneIcon,
  SofaIcon,
  SparklesIcon,
  StarIcon,
  TagIcon,
  TentIcon,
  TvIcon,
  UtensilsIcon,
  WatchIcon,
  WrenchIcon,
  type LucideIcon,
} from 'lucide-react';

export interface CategoryIcon {
  /** Lucide's name for it, which the backend stores and the storefront looks up. */
  name: string;
  /** What staff search for and hear. */
  label: string;
  icon: LucideIcon;
}

/**
 * The icons a category can have, imported one by one so that only these reach the bundle. The
 * backend checks only the name's format, so the storefront needs the same names.
 */
export const categoryIcons: CategoryIcon[] = [
  { name: 'shirt', label: 'Shirt', icon: ShirtIcon },
  { name: 'footprints', label: 'Shoes', icon: FootprintsIcon },
  { name: 'shopping-bag', label: 'Bag', icon: ShoppingBagIcon },
  { name: 'backpack', label: 'Backpack', icon: BackpackIcon },
  { name: 'watch', label: 'Watch', icon: WatchIcon },
  { name: 'glasses', label: 'Glasses', icon: GlassesIcon },
  { name: 'gem', label: 'Jewelry', icon: GemIcon },
  { name: 'sparkles', label: 'Beauty', icon: SparklesIcon },
  { name: 'scissors', label: 'Scissors', icon: ScissorsIcon },
  { name: 'baby', label: 'Baby', icon: BabyIcon },
  { name: 'dog', label: 'Dog', icon: DogIcon },
  { name: 'cat', label: 'Cat', icon: CatIcon },
  { name: 'house', label: 'Home', icon: HouseIcon },
  { name: 'sofa', label: 'Furniture', icon: SofaIcon },
  { name: 'bed', label: 'Bed', icon: BedIcon },
  { name: 'lamp', label: 'Lamp', icon: LampIcon },
  { name: 'utensils', label: 'Kitchen', icon: UtensilsIcon },
  { name: 'coffee', label: 'Coffee', icon: CoffeeIcon },
  { name: 'cake', label: 'Cake', icon: CakeIcon },
  { name: 'apple', label: 'Fruit', icon: AppleIcon },
  { name: 'carrot', label: 'Vegetables', icon: CarrotIcon },
  { name: 'pill', label: 'Medicine', icon: PillIcon },
  { name: 'heart-pulse', label: 'Health', icon: HeartPulseIcon },
  { name: 'smartphone', label: 'Phone', icon: SmartphoneIcon },
  { name: 'laptop', label: 'Laptop', icon: LaptopIcon },
  { name: 'headphones', label: 'Headphones', icon: HeadphonesIcon },
  { name: 'camera', label: 'Camera', icon: CameraIcon },
  { name: 'tv', label: 'TV', icon: TvIcon },
  { name: 'gamepad-2', label: 'Games', icon: Gamepad2Icon },
  { name: 'music', label: 'Music', icon: MusicIcon },
  { name: 'book-open', label: 'Books', icon: BookOpenIcon },
  { name: 'palette', label: 'Art', icon: PaletteIcon },
  { name: 'dumbbell', label: 'Fitness', icon: DumbbellIcon },
  { name: 'bike', label: 'Bike', icon: BikeIcon },
  { name: 'tent', label: 'Outdoors', icon: TentIcon },
  { name: 'car', label: 'Car', icon: CarIcon },
  { name: 'wrench', label: 'Tools', icon: WrenchIcon },
  { name: 'hammer', label: 'Hardware', icon: HammerIcon },
  { name: 'flower-2', label: 'Flowers', icon: Flower2Icon },
  { name: 'leaf', label: 'Plants', icon: LeafIcon },
  { name: 'gift', label: 'Gifts', icon: GiftIcon },
  { name: 'package', label: 'Package', icon: PackageIcon },
  { name: 'tag', label: 'Deals', icon: TagIcon },
  { name: 'star', label: 'Featured', icon: StarIcon },
];

/** The icon for a stored name, or undefined for none or a name this app does not have. */
export function findCategoryIcon(name: string | null) {
  return categoryIcons.find((item) => item.name === name);
}
