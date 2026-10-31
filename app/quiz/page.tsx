import type { Metadata } from "next";
import Quiz from "@/components/Quiz";
import Footer from "@/components/Footer";
import { getCatalog } from "@/lib/tmdb";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Recommend me a movie · Butaca",
  description: "Six quick questions about your night, one great pick on a service you already pay for.",
};

export default async function Page() {
  const catalog = await getCatalog();
  return (
    <>
      <Quiz catalog={catalog} />
      <Footer catalog={catalog} />
    </>
  );
}
