import { register } from 'node:module';

register(new URL('./moduleAliasLoader.mjs', import.meta.url), import.meta.url);
