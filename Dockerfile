# 1. Base image for development
FROM node:18-alpine as development

# Set the working directory in the container
WORKDIR /app

# Install dependencies for all workspaces
COPY package*.json ./
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/

# Install dependencies
RUN npm install

# Install backend dependencies
RUN npm install --prefix backend

# Install frontend dependencies
RUN npm install --prefix frontend

# Copy the rest of the application's source code
COPY . .

# Expose ports for backend and frontend dev server
EXPOSE 3000
EXPOSE 5173

# The command to run both services
CMD [ "npm", "run", "dev" ] 