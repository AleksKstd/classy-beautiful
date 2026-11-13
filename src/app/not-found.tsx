import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <section className="py-24">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-xl text-center">
        <p className="eyebrow mb-4">404</p>
        <h1 className="text-4xl sm:text-5xl mb-4">Страницата не е намерена</h1>
        <p className="text-taupe-600 mb-10">Възможно е адресът да е грешен или страницата да е преместена.</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild size="lg">
            <Link href="/rezervacii">Запази час</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/">Начало</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
