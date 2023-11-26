export type Contact = {
  name: string;
  email?: string;
  url?: string;
};

export type GlobalOptions = {
  registry?: string;
  verbose?: boolean;
  color?: boolean;
  upstream?: boolean;
  cn?: boolean;
  systemUser?: boolean;
  wsl?: boolean;
  chdir?: string;
};
