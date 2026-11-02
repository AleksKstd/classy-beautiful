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
        <h1 className="text-3xl font-bold mb-4">Нещо се обърка</h1>
        <p className="text-gray-600 mb-8">
          Страницата не може да бъде заредена в момента. Моля, опитайте отново или ни се обадете на{" "}
          <a href={`tel:${BUSINESS.phone}`} className="text-gold hover:underline">
            {BUSINESS.phoneDisplay}
          </a>
          .
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={reset} size="lg">ОПИТАЙ ОТНОВО</Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/">НАЧАЛО</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
