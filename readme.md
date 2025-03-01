
# 🚀 Job Sync AI - Running with Docker Compose  

This guide explains how to set up and run the **Job Sync AI** project using Docker Compose.  

---

## 🛠 Prerequisites  

Ensure you have the following installed before proceeding:  

- [Docker](https://www.docker.com/)  
- [Docker Compose](https://docs.docker.com/compose/)  

---

## ⚙️ How to Run
1️⃣ Clone the Repository

```bash
git clone https://github.com/yourusername/job_sync_ai.git
cd job_sync_ai
```

2️⃣ Build and Start Services

```bash
docker-compose up --build
```

This will:
- ✅ Build & start the backend (Django) on http://localhost:8000
- ✅ Build & start the frontend (Next.js) on http://localhost:3005

--- 
## 🛠 Available Services
### Service	Description	URL:
Backend	Django API Server:
```bash
	http://localhost:8000
```
Frontend	Next.js UI:
```bash
    http://localhost:3005
```

## To stop the services:
```bash
docker-compose down
```






