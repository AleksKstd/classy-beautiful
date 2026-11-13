"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BUSINESS } from "@/config/site";

/** Shown instead of a blank page when a page fails to load (e.g. database unavailable). */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section className="py-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-xl text-center">
        <h1 className="text-4xl sm:text-5xl mb-4">Нещо се обърка</h1>
        <p className="text-taupe-600 mb-8">
          Страницата не може да бъде заредена в момента. Моля, опитайте отново или ни се обадете на{" "}
          <a href={`tel:${BUSINESS.phone}`} className="text-gold-dark underline underline-offset-2">
            {BUSINESS.phoneDisplay}
          </a>
          .
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={reset} size="lg">Опитай отново</Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/">Начало</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
