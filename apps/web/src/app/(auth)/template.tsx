import { PageTransition } from "@/components/motion/PageTransition";

export default function AuthTemplate({ children }: { children: React.ReactNode }) {
  return <PageTransition lift>{children}</PageTransition>;
}
