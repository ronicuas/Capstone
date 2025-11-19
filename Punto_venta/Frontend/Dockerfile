FROM node:20-alpine

# Carpeta de trabajo dentro del contenedor
WORKDIR /usr/src/app

# Copiamos sólo los manifiestos primero para aprovechar la cache de dependencias
COPY package.json package-lock.json ./

# Instala dependencias. Si el lock no está sincronizado, hace npm install como fallback.
RUN npm ci || npm install

# Copiamos el resto del código
COPY . .

EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host"]
