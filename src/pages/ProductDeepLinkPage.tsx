import React, { useEffect, useRef, useState } from "react";
import { Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import { productService } from "../services/product.service";
import { storeService } from "../services/store.service";
import { ProductDetailSkeleton } from "../components/common/PageSkeletons";
import { tryOpenAndroidAppForProductPath } from "../utils/tryOpenAndroidAppLink";
import {
  isProductDetailNotFoundError,
  redirectForUnavailableProduct,
} from "../utils/productUnavailableAtStore";
import {
  productSlugRouteDiffersFromParam,
  sanitizeProductRouteSlug,
} from "../utils/productSlug";
import { PRODUCT_DEEPLINK_WEB_PARAM } from "../utils/tryOpenAndroidAppLink";

/**
 * Universal product URL: https://customerapp.mygendaphool.com/products/:slug
 * Resolves catalog availability and opens the correct feature PDP.
 */
const ProductDeepLinkPage: React.FC = () => {
  const { slug: slugParam } = useParams<{ slug: string }>();
  const slug = sanitizeProductRouteSlug(slugParam);
  const location = useLocation();
  const navigate = useNavigate();
  const [targetPath, setTargetPath] = useState<string | null>(null);
  const triedAndroidAppOpen = useRef(false);
  const handledUnavailable = useRef(false);

  useEffect(() => {
    if (!productSlugRouteDiffersFromParam(slugParam, slug)) return;
    navigate(
      `/products/${encodeURIComponent(slug)}${location.search}`,
      { replace: true },
    );
  }, [slug, slugParam, location.search, navigate]);

  useEffect(() => {
    if (!slug || triedAndroidAppOpen.current) return;
    const openInWeb =
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get(PRODUCT_DEEPLINK_WEB_PARAM) === "1";
    if (openInWeb) return;
    triedAndroidAppOpen.current = true;
    tryOpenAndroidAppForProductPath(slug);
  }, [slug]);

  useEffect(() => {
    if (!slug) {
      if (!handledUnavailable.current) {
        handledUnavailable.current = true;
        redirectForUnavailableProduct(navigate, "/gp-store");
      }
      return;
    }
    let cancelled = false;
    const normalizedSlug = slug;

    async function loadProductForDeepLink() {
      try {
        return await productService.getProductBySlug(normalizedSlug);
      } catch (error) {
        if (!isProductDetailNotFoundError(error)) throw error;
        let storeId: number | null = null;
        try {
          storeId = await storeService.resolveStoreIdForApiAsync();
        } catch {
          /* optional */
        }
        if (storeId) {
          return await productService.getProductBySlug(normalizedSlug, {
            storeId,
          });
        }
        throw error;
      }
    }

    (async () => {
      try {
        const product = await loadProductForDeepLink();
        if (cancelled) return;
        const availability = String(
          (product as { availability_type?: string }).availability_type ?? "",
        ).toLowerCase();
        const isDaily =
          availability.includes("daily") ||
          product.isDaily === true ||
          (product as { is_daily?: boolean }).is_daily === true;
        const encoded = encodeURIComponent(normalizedSlug);
        setTargetPath(
          isDaily ? `/gp-daily/product/${encoded}` : `/gp-store/product/${encoded}`,
        );
      } catch (error) {
        if (cancelled || handledUnavailable.current) return;
        handledUnavailable.current = true;
        if (isProductDetailNotFoundError(error)) {
          redirectForUnavailableProduct(navigate, "/gp-store");
        } else {
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

  return (
    <div
      className="min-h-screen bg-[#f8f6f1]"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <p className="sr-only">Opening product…</p>
      <ProductDetailSkeleton />
    </div>
  );
};

export default ProductDeepLinkPage;
