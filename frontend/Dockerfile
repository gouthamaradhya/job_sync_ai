# Use a more stable image
FROM node:21

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json first for better caching
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application
COPY . .

# Expose the correct port
EXPOSE 3005

# Set the correct entrypoint
CMD ["npm", "run", "dev"]
