declare module "next/font/google" {
  export const Geist: (options?: {
    subsets?: string[];
    variable?: string;
    display?: string;
  }) => { variable: string; className: string };

  export const Geist_Mono: (options?: {
    subsets?: string[];
    variable?: string;
    display?: string;
  }) => { variable: string; className: string };
}
