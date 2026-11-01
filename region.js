const CURRENCY_BY_COUNTRY = { CA: "CAD", US: "USD", GB: "GBP", NG: "NGN" };

export function onRequestGet({ request }) {
  const country = (request.cf && request.cf.country) || "";
  const currency = CURRENCY_BY_COUNTRY[country] || "USD";
  return new Response(JSON.stringify({ country, currency }), {
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store"
    }
  });
}
