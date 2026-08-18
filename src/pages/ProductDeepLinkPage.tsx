import React, { useEffect, useRef, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import { productService } from "../services/product.service";
import { GpDailyHomeSkeleton } from "../components/common/PageSkeletons";
import { tryOpenAndroidAppForProductPath } from "../utils/tryOpenAndroidAppLink";

/**
 * Universal product URL: https://customerapp.mygendaphool.com/products/:slug
 * Resolves catalog availability and opens the correct feature PDP.
 */
const ProductDeepLinkPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [targetPath, setTargetPath] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const triedAndroidAppOpen = useRef(false);

  useEffect(() => {
    if (!slug?.trim() || triedAndroidAppOpen.current) return;
    triedAndroidAppOpen.current = true;
    tryOpenAndroidAppForProductPath(slug);
  }, [slug]);

  useEffect(() => {
    if (!slug?.trim()) {
      setNotFound(true);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const product = await productService.getProductBySlug(slug.trim());
        if (cancelled) return;
        const availability = String(
          (product as { availability_type?: string }).availability_type ?? "",
        ).toLowerCase();
        const isDaily =
          availability.includes("daily") ||
          product.isDaily === true ||
          (product as { is_daily?: boolean }).is_daily === true;
        const encoded = encodeURIComponent(slug.trim());
        setTargetPath(
          isDaily ? `/gp-daily/product/${encoded}` : `/gp-store/product/${encoded}`,
        );
      } catch {
        if (!cancelled) setNotFound(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (notFound) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f8f6f1] px-6">
        <p className="text-center text-gray-600">Product not found</p>
      </div>
    );
  }

  if (targetPath) {
    return <Navigate to={targetPath} replace />;
  }

  return <GpDailyHomeSkeleton />;
};

export default ProductDeepLinkPage;
