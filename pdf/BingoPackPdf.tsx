02:17:20.292 Running build in Washington, D.C., USA (East) – iad1
02:17:20.292 Build machine configuration: 2 cores, 8 GB
02:17:20.422 Cloning github.com/Chronic-W-F/grower-bingo-generator (Branch: main, Commit: 95d147d)
02:17:20.630 Cloning completed: 208.000ms
02:17:21.065 Restored build cache from previous deployment (DTX9wQCSib9DZww6zoi952HePUjg)
02:17:21.488 Running "vercel build"
02:17:21.891 Vercel CLI 50.1.3
02:17:22.205 Installing dependencies...
02:17:24.276 
02:17:24.277 up to date in 2s
02:17:24.277 
02:17:24.277 6 packages are looking for funding
02:17:24.277   run `npm fund` for details
02:17:24.310 Detected Next.js version: 14.2.35
02:17:24.313 Running "npm run build"
02:17:24.410 
02:17:24.411 > build
02:17:24.411 > next build
02:17:24.411 
02:17:25.049   ▲ Next.js 14.2.35
02:17:25.050 
02:17:25.065    Creating an optimized production build ...
02:17:29.083  ✓ Compiled successfully
02:17:29.084    Linting and checking validity of types ...
02:17:29.367 
02:17:29.369    We detected TypeScript in your project and reconfigured your tsconfig.json file for you. Strict-mode is set to false by default.
02:17:29.369    The following suggested values were added to your tsconfig.json. These values can be changed to fit your project's needs:
02:17:29.369 
02:17:29.369    	- include was updated to add '.next/types/**/*.ts'
02:17:29.369    	- plugins was updated to add { name: 'next' }
02:17:29.369 
02:17:31.683 Failed to compile.
02:17:31.683 
02:17:31.683 ./pdf/BingoPackPdf.tsx:113:3
02:17:31.684 Type error: Type 'ReadableStream' is missing the following properties from type 'Buffer<ArrayBufferLike>': slice, subarray, write, toJSON, and 102 more.
02:17:31.684 
02:17:31.684 [0m [90m 111 |[39m   [36mconst[39m instance [33m=[39m pdf(doc)[33m;[39m[0m
02:17:31.684 [0m [90m 112 |[39m   [36mconst[39m buffer [33m=[39m [36mawait[39m instance[33m.[39mtoBuffer()[33m;[39m[0m
02:17:31.684 [0m[31m[1m>[22m[39m[90m 113 |[39m   [36mreturn[39m buffer[33m;[39m[0m
02:17:31.684 [0m [90m     |[39m   [31m[1m^[22m[39m[0m
02:17:31.684 [0m [90m 114 |[39m }[0m
02:17:31.684 [0m [90m 115 |[39m[0m
02:17:31.701 Next.js build worker exited with code: 1 and signal: null
02:17:31.719 Error: Command "npm run build" exited with 1
