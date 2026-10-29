export const REPO_URL = process.env.NEXT_PUBLIC_REPO_URL || "";

export const FTC_URL =
  "https://www.ftc.gov/news-events/news/press-releases/2025/03/new-ftc-data-show-big-jump-reported-losses-fraud-125-billion-2024";

/** Shown when the backend can't be reached yet; mirrors the defaults in backend/app/config.py. */
export const DEFAULT_TIERS = [
  { name: "nano", label: "Nano", model: "nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B", input_price: 0.06, output_price: 0.24 },
  { name: "super", label: "Super", model: "nvidia/nemotron-3-super-120b-a12b", input_price: 0.3, output_price: 0.9 },
  { name: "ultra", label: "Ultra", model: "nvidia/Nemotron-3-Ultra-550b-a55b", input_price: 1.0, output_price: 3.0 },
] as const;
