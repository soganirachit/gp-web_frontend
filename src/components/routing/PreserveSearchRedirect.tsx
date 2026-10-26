import { Navigate, useLocation } from "react-router-dom";

type Props = { to: string };

/** Redirect while keeping query string (e.g. `/products?category=flowers`). */
export default function PreserveSearchRedirect({ to }: Props) {
  const { search, state } = useLocation();
  return <Navigate to={`${to}${search}`} replace state={state} />;
}
