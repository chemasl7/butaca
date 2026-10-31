import Home from "@/components/Home";
import Footer from "@/components/Footer";
import { getCatalog } from "@/lib/tmdb";

// Rebuild the catalog at most once a day
export const revalidate = 86400;

export default async function Page() {
  const catalog = await getCatalog();
  return (
    <>
      <Home catalog={catalog} />
      <Footer catalog={catalog} />
    </>
  );
}
