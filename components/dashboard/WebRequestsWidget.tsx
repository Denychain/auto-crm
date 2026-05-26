import Link from "next/link";

interface WebRequest {
  id:      string;
  description: string | null;
  createdAt:   string | Date;
  client: {
    name:  string;
    phone: string;
  };
  vehicle: {
    make:  string;
    model: string;
  };
  photos: Array<{ url: string }>;
}

interface Props {
  orders: WebRequest[];
}

export function WebRequestsWidget({ orders }: Props) {
  if (orders.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-semibold text-amber-900">
        🌐 Заявки з сайту ({orders.length})
      </p>

      {orders.map((order) => {
        const photo = order.photos[0]?.url ?? null;
        const carLabel = [order.vehicle.make, order.vehicle.model]
          .filter(Boolean)
          .join(" ");

        return (
          <Link
            key={order.id}
            href={`/orders/${order.id}`}
            className="flex items-start gap-3 rounded-lg border border-amber-200 bg-white p-3 shadow-sm hover:border-amber-400 transition-colors"
          >
            {/* Photo thumbnail */}
            {photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photo}
                alt="Фото авто"
                className="h-14 w-14 shrink-0 rounded object-cover"
              />
            ) : (
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded bg-amber-100 text-amber-400">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-6 w-6">
                  <path d="M4 18 L20 18 M8 18 L8 8 L16 8 L16 18" />
                </svg>
              </div>
            )}

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-sm text-gray-900 truncate">
                  {order.client.name}
                </span>
                <span className="shrink-0 text-xs text-gray-400">
                  {new Date(order.createdAt).toLocaleDateString("uk-UA", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>

              <p className="text-xs text-gray-500 mt-0.5">{order.client.phone}</p>

              {carLabel && carLabel !== "Невідомо Невідомо" && (
                <p className="text-xs text-gray-600 mt-0.5">{carLabel}</p>
              )}

              {order.description && (
                <p className="mt-1 text-xs text-gray-500 line-clamp-2">
                  {order.description}
                </p>
              )}
            </div>

            {/* Arrow */}
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              className="h-4 w-4 shrink-0 self-center text-gray-400"
            >
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </Link>
        );
      })}
    </div>
  );
}
