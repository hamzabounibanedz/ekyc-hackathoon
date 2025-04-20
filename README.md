# eKYC Backend & AI Services

## Overview
This repository contains the **Backend** for an end-to-end electronic KYC (eKYC) solution and two **AI microservices**:

1. **OCR Service** (Flask + Tesseract) – extracts text and confidence from ID images.
2. **Face-Match Service** (Flask + DeepFace) – verifies selfie against ID.

The backend handles:
- OTP-based signup & login (mock OTP)
- JWT-based authentication
- Image upload for KYC
- Real-time status updates via WebSockets
- Job-queue integration (Redis + Bull)

> **Note:** Core OTP auth, image upload, and WebSocket flows are fully implemented and tested. AI-service integration (calling OCR and Face-Match) is nearly complete; just requires final endpoint wiring and configuration.

---

## Repository Structure
```
├── backend/                  # Node.js backend
│   ├── app.js                # Express app setup
│   ├── server.js             # HTTP + WebSocket bootstrap
│   ├── src/
│   │   ├── config/           # DB, Redis, env configs
│   │   ├── routes/           # API route definitions
│   │   ├── controllers/      # Request handlers
│   │   ├── models/           # Mongoose schemas
│   │   ├── middlewares/      # Middlewares (auth, errors)
│   │   ├── core/
│   │   │   └── kycWorker.js   # KYC job processor
│   │   └── tests/            # Jest & supertest flows
│   └── package.json          # Dependencies & scripts
│
├── ocr-service/              # Python OCR microservice
│   ├── ocr_service.py        # Flask endpoint `/ocr`
│   └── requirements.txt      # Python dependencies
│
├── face-match-service/       # Python Face-Match microservice
│   ├── face_match_service.py # Flask endpoint `/match`
│   └── requirements.txt      # Python dependencies
│
└── README.md                 # This file
```

---

## Prerequisites
- **Node.js** ≥16
- **Python** ≥3.8
- **Tesseract OCR** (for OCR service)
- **Redis** (local or via Docker)
- **MongoDB** (local or remote)
- **pip** for Python packages

---

## Setup & Installation

### 1. Clone the Repo
```bash
git clone https://github.com/<your-org>/ekyc-workflow.git
cd ekyc-workflow
```

### 2. Backend Installation
```bash
cd backend
npm install
```

Create a `.env` in `backend/`:
```
PORT=3000
MONGODB_URI=mongodb://localhost:27017/ekyc
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
JWT_SECRET=your_jwt_secret
OCR_URL=http://localhost:5001/ocr
MATCH_URL=http://localhost:5002/match
BLOCKCHAIN_URL=http://localhost:4000/blockchain/issue
```

### 3. AI Services Installation

#### OCR Service
```bash
cd ../ocr-service
env/bin/activate      # or `python3 -m venv venv && source venv/bin/activate`
pip install -r requirements.txt
```

#### Face-Match Service
```bash
cd ../face-match-service
env/bin/activate
pip install -r requirements.txt
```

---

## Running the Services

1. **Redis & MongoDB** – start locally or via Docker.
2. **Backend** (in `/backend`):
   ```bash
   npm start
   ```
3. **OCR Service** (in `/ocr-service`):
   ```bash
   python ocr_service.py
   ```
4. **Face-Match Service** (in `/face-match-service`):
   ```bash
   python face_match_service.py
   ```

All services should now be listening:
- Backend API: `http://localhost:3000`
- OCR: `http://localhost:5001/ocr`
- Face-Match: `http://localhost:5002/match`

---

## Usage

1. **Signup & Login** – POST `/auth/signup`, then `/auth/verify-otp` to receive a JWT.
2. **Submit KYC** – POST `/kyc/submit` with form data (`name`, `dob`, etc.) and files (`idFront`, `idBack`, `selfie`). Returns `jobId`.
3. **WebSocket Status** – connect to `ws://localhost:3000/kyc?userId=<yourUserId>`, listen for `kycUpdate` events.
4. **Status Polling** – GET `/kyc/status/:jobId` for current status.

---

## Integration with AI Services
- The worker in `src/core/kycWorker.js` enqueues KYC jobs and calls the OCR and Face-Match endpoints.
- Ensure `OCR_URL` and `MATCH_URL` in `.env` point to your local AI services.
- After OCR & Match, approved jobs will trigger blockchain issuance (not yet wired).

> **Next Steps:**
> - Finalize blockchain issuance integration.
> - Enhance OCR field extraction.
> - Add robust error handling & retry logic.

---

## Testing

In the `backend/` folder:
```bash
npm test         # run Jest tests
npm run test:watch
npm run test:coverage
```

Use `src/tests/testKycFlow.js` for an end-to-end KYC flow demo.

---

## License
MIT © Hamza and chouaib

