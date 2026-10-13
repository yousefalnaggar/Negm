// Re-mounts on every navigation, so each store page fades in.
export default function StoreTemplate({ children }: { children: React.ReactNode }) {
  return <div className="animate-fade-in">{children}</div>;
}
