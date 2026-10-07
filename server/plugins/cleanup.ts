const SWEEP_INTERVAL_MS = 15 * 60 * 1000

export default defineNitroPlugin(() => {
   const sweep = () => {
      purgeExpiredSecrets()
      sweepRateLimits()
   }
   sweep()
   setInterval(sweep, SWEEP_INTERVAL_MS).unref()
})
