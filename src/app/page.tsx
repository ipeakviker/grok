import JarvisApp from "@/components/JarvisApp";

export default function HomePage() {
  // GitHub Pages is static-only: no Postgres/API. Chat starts empty; WASM runs in-browser.
  return <JarvisApp initialMessages={[]} />;
}
