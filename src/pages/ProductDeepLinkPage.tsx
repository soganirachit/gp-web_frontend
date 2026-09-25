import React, { useEffect, useRef, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { productService } from "../services/product.service";
import { GpDailyHomeSkeleton } from "../components/common/PageSkeletons";
import { tryOpenAndroidAppForProductPath } from "../utils/tryOpenAndroidAppLink";
import {
  isProductDetailNotFoundError,
  redirectForUnavailableProduct,
} from "../utils/productUnavailableAtStore";

/**
 * Universal product URL: https://customerapp.mygendaphool.com/products/:slug
 * Resolves catalog availability and opens the correct feature PDP.
 */
const ProductDeepLinkPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [targetPath, setTargetPath] = useState<string | null>(null);
  const triedAndroidAppOpen = useRef(false);
  const handledUnavailable = useRef(false);

  useEffect(() => {
    if (!slug?.trim() || triedAndroidAppOpen.current) return;
    triedAndroidAppOpen.current = true;
    tryOpenAndroidAppForProductPath(slug);
  }, [slug]);

  useEffect(() => {
    if (!slug?.trim()) {
      if (!handledUnavailable.current) {
        handledUnavailable.current = true;
        redirectForUnavailableProduct(navigate, "/gp-store");
      }
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
      } catch (error) {
        if (cancelled || handledUnavailable.current) return;
        if (isProductDetailNotFoundError(error)) {
          handledUnavailable.current = true;
          redirectForUnavailableProduct(navigate, "/gp-store");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug, navigate]);

  if (targetPath) {
    return <Navigate to={targetPath} replace />;
  }

  return <GpDailyHomeSkeleton />;
};

export default ProductDeepLinkPage;
