import { motion } from "framer-motion";
import { useScrollReveal } from "@/hooks/useScrollReveal";

const coHosts = [
  { name: "Creators Circuit", src: "/partners/creatorlabo-log.png", alt: "Creators Circuit logo" },
  { name: "TIU Impact Next", src: "/partners/impact-next.png", alt: "TIU Impact Next logo" },
];

const ecosystemPartners = [
  { name: "Peer Portal", src: null },
  { name: "Netlink AI", src: "/partners/netlink-ai.png", alt: "Netlink AI logo", logoClassName: "h-[140%] w-[170%] max-w-none max-h-none" },
  { name: "Tokyo Design", src: "/partners/Tokyo%20Design.png", alt: "Tokyo Design logo" },
  { name: "Lovable", src: "/partners/lovable.png", alt: "Lovable logo" },
];

const OrganizersPartnersSection = () => {
  const { ref, isVisible } = useScrollReveal<HTMLDivElement>({ threshold: 0.15 });

  return (
    <section className="relative overflow-hidden px-6 py-32" id="organizers">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-24 h-96 w-96 -translate-x-1/2 rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute right-0 top-1/2 h-64 w-64 -translate-y-1/2 rounded-full bg-secondary/10 blur-[120px]" />
      </div>

      <div ref={ref} className="mx-auto max-w-5xl">
        <motion.div
          className="mb-16 text-center"
          initial={{ opacity: 0, y: 40 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
        >
          <span className="font-display text-sm tracking-[0.3em] text-primary">
            ORGANIZERS &amp; PARTNERS
          </span>
          <h2 className="mt-4 font-display text-4xl font-bold tracking-tight text-foreground md:text-5xl">
            Organizers &amp; Partners
          </h2>
        </motion.div>

        {/* Host */}
        <motion.div
          className="mb-16 text-center"
          initial={{ opacity: 0, y: 30 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <h3 className="font-display text-sm tracking-[0.25em] text-muted-foreground">Host</h3>
          <p className="mt-3 font-display text-2xl font-semibold text-foreground md:text-3xl">
            Cognisor AI
          </p>
          <div className="mt-6 flex justify-center">
            <div className="flex h-24 w-52 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-white/10 via-white/5 to-transparent px-6 py-4 shadow-lg shadow-black/30">
              <img
                src="/partners/cognisor.png"
                alt="Cognisor AI logo"
                className="h-full max-h-20 w-full object-contain"
                loading="lazy"
              />
            </div>
          </div>
        </motion.div>

        {/* Co-Hosts */}
        <motion.div
          className="mb-16"
          initial={{ opacity: 0, y: 30 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <h3 className="text-center font-display text-sm tracking-[0.25em] text-muted-foreground">
            Co Hosts
          </h3>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-6">
            {coHosts.map((host) => (
              <div key={host.name} className="text-center">
                <div className="flex h-24 w-52 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-white/10 via-white/5 to-transparent px-6 py-4 shadow-lg shadow-black/30">
                  <img
                    src={host.src}
                    alt={host.alt}
                    className="h-full max-h-20 w-full object-contain"
                    loading="lazy"
                  />
                </div>
                <p className="mt-3 font-display text-sm tracking-wide text-foreground">
                  {host.name}
                </p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Ecosystem Partners */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <h3 className="text-center font-display text-sm tracking-[0.25em] text-muted-foreground">
            Ecosystem Partners
          </h3>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {ecosystemPartners.map((partner) => (
              <div
                key={partner.name}
                className="flex h-28 flex-col items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-white/10 via-white/5 to-transparent px-4 py-4 shadow-lg shadow-black/30"
              >
                {partner.src ? (
                  <img
                    src={partner.src}
                    alt={partner.alt ?? `${partner.name} logo`}
                    className={`h-full max-h-16 w-full object-contain ${partner.logoClassName ?? ""}`}
                    loading="lazy"
                  />
                ) : (
                  <span className="font-display text-lg tracking-wide text-foreground">
                    {partner.name}
                  </span>
                )}
                {partner.src ? (
                  <span className="mt-2 font-display text-xs tracking-wide text-muted-foreground">
                    {partner.name}
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default OrganizersPartnersSection;
