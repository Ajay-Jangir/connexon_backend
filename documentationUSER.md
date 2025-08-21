# 📘 API Documentation: Register User

## Endpoint

**POST** `/api/user/register`

Registers a new user with basic profile details and at least one phone number.

---

## 📅 Request Body (JSON)

```json
{
  "first_name": "Ajay",
  "middle_name": "Kumar",
  "last_name": "Singh",
  "email": "ajay@example.com",
  "password": "StrongPass@123",
  "dob": "1999-07-01",
  "address": "123 Street, Delhi",
  "phone_numbers": [
    {
      "country_code": "+91",
      "phone_number": "9876543210"
    }
  ]
}
```

> ✅ `middle_name`, `last_name`, `dob`, and `address` are optional. All others are **required**.

---

## ✅ Validation Rules

| Field           | Rules                                                      |
| --------------- | ---------------------------------------------------------- |
| `first_name`    | Required, trimmed                                          |
| `email`         | Required, must be valid, unique                            |
| `password`      | Required, min 8 characters                                 |
| `phone_numbers` | Required, must contain at least one valid object           |
| `country_code`  | Required inside phone object, must match `+\d{1,4}` format |
| `phone_number`  | Required inside phone object, valid format, unique         |
| `dob`           | Optional                                                   |
| `address`       | Optional                                                   |

---

## 🔐 Password Policy

- Minimum 8 characters (extendable to include special characters, uppercase, etc.)

---

## 📤 Success Response

**Status:** `201 Created`

```json
{
  "status": "success",
  "message": "User registered successfully",
  "user_id": 123
}
```

---

## ❌ Error Responses

### 1. Missing Required Fields

**Status:** `400 Bad Request`

```json
{
  "path": "body",
  "message": "Required fields missing"
}
```

### 2. Invalid Phone Number

**Status:** `400 Bad Request`

```json
{
  "path": "phone_number",
  "message": "Invalid phone number format"
}
```

### 3. Invalid Country Code

**Status:** `400 Bad Request`

```json
{
  "path": "country_code",
  "message": "Invalid country code format. Example: +91"
}
```

### 4. Weak Password

**Status:** `400 Bad Request`

```json
{
  "path": "password",
  "message": "Password must be at least 8 characters long"
}
```

### 5. Email Already Registered

**Status:** `409 Conflict`

```json
{
  "path": "email",
  "message": "Email already registered"
}
```

### 6. Phone Number Already Registered

**Status:** `409 Conflict`

```json
{
  "path": "phone_number",
  "message": "Phone number already registered"
}
```

### 7. Internal Server Error

**Status:** `500 Internal Server Error`

```json
{
  "path": "server",
  "message": "Internal server error"
}
```

---

## 🧪 Test Data Example

```json
{
  "first_name": "Raj",
  "middle_name": "",
  "last_name": "Verma",
  "email": "rajverma123@example.com",
  "password": "MyPassw0rd!",
  "dob": "2000-01-01",
  "address": "Gurgaon, India",
  "phone_numbers": [
    {
      "country_code": "+91",
      "phone_number": "9999988888"
    }
  ]
}
```

---

## 🔐 USER Login

## 🔐 POST `/api/user/login`

Authenticates a user using email and password. Returns a JWT token if credentials are valid.

### 📅 Request Body (JSON)

```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

> ✅ Both `email` and `password` are **required**.

### 🔐 Token Details

- Payload: `{ id, email }`
- Expiry: `10h`
- Secret key: From `.env` → `JWT_SECRET`

### 📤 Success Response

**Status:** `200 OK`

```json
{
  "status": "success",
  "message": "Login successful",
  "token": "jwt_token_here"
}
```

### ❌ Error Responses

#### 1. Missing Credentials

**Status:** `400 Bad Request`

```json
{
  "message": "Email and password are required"
}
```

#### 2. Invalid Credentials

**Status:** `401 Unauthorized`

```json
{
  "message": "Invalid email or password"
}
```

#### 3. Internal Server Error

**Status:** `500 Internal Server Error`

```json
{
  "path": "server",
  "message": "Internal server error"
}
```

### 🧪 Test Data Example

```json
{
  "email": "rajverma123@example.com",
  "password": "MyPassw0rd!"
}
```

## Update User Profile

**Endpoint:**  
`PUT /api/user/update`

**Headers:**

- `Authorization: Bearer <token>` (required)

**Request Body:**

```json
{
  "first_name": "Ajay",
  "middle_name": "Kumar",
  "last_name": "Singh",
  "email": "ajay@example.com",
  "dob": "1998-05-12",
  "address": "123 Main Street"
}
```

**Success Response (200):**

```json
{
  "status": "success",
  "message": "User updated successfully"
}
```

**Error Response (400):**

```json
{
  "path": "email",
  "message": "Invalid email format"
}
```

---

### Get My Profile

**Endpoint:**  
`GET /api/user/myprofile`

**Description:**  
Fetch the authenticated user's complete profile including personal details, phone numbers, active QR code, active payment, and plan details.

**Headers:**

- `Authorization: Bearer <token>`

---

#### ✅ Success Response (200)

```json
{
  "status": "success",
  "message": "User profile fetched successfully",
  "data": {
    "id": 10,
    "first_name": "Ajay",
    "middle_name": "Jangir",
    "last_name": "Kumar",
    "full_name": "Ajay Jangir Kumar",
    "email": "ajayyy@example.com",
    "dob": "2002-01-01",
    "address": "Delhi, India",
    "status": "active",
    "current_plan_start": "2025-08-01T11:10:36.397Z",
    "current_plan_end": "2025-10-30T11:10:36.397Z",
    "membership_plan_id": 4,
    "created_at": "2025-07-31T11:04:42.129Z",
    "updated_at": "2025-08-01T11:10:36.397Z",
    "phone_numbers": [
      {
        "country_code": "+1",
        "phone_number": "5121456107"
      },
      {
        "country_code": "+91",
        "phone_number": "9125178910"
      },
      {
        "country_code": "+91",
        "phone_number": "9844311100"
      }
    ],
    "active_qr_code": {
      "id": 16,
      "user_id": 10,
      "qr_code_data": "data:image/png;base64,iVBORw0K...",
      "vcard": null,
      "is_active": true,
      "expires_at": "2025-10-30T16:40:36.397051",
      "created_at": "2025-08-01T18:37:22.047407"
    },
    "active_payment": {
      "id": 9,
      "user_id": 10,
      "plan_id": 4,
      "amount": 199.99,
      "payment_method": "UPI",
      "payment_gateway": "Razorpay",
      "gateway_order_id": "order_R034qJeXrSypKq",
      "gateway_payment_id": "pay_R035e5NO1Ez8k2",
      "gateway_signature": "c14081bbcc86229e1b8c26a301a66babb66251ff770e9a7d05af57ed769e4400",
      "status": "paid",
      "paid_at": "2025-08-01T16:40:36.397051",
      "plan_start_date": "2025-08-01T16:40:36.397051",
      "plan_end_date": "2025-10-30T16:40:36.397051",
      "created_at": "2025-08-01T16:39:37.508233",
      "metadata": {
        "browser": "Unknown",
        "location": "undefined, undefined",
        "created_at": "2025-08-01T11:09:37.506Z",
        "created_by": "user",
        "ip_address": "127.0.0.1",
        "user_agent": "PostmanRuntime/7.44.1",
        "device_type": "Desktop",
        "duration_days": 90
      }
    },
    "plan_details": {
      "id": 4,
      "name": "Standard Plan",
      "description": "Best for professionals who want a balance of features and affordability.",
      "price": 199.99,
      "duration_in_days": 90,
      "features": ["Custom QR code", "vCard download", "Basic analytics"],
      "is_active": true,
      "created_at": "2025-07-29T23:15:23.775024"
    }
  }
}
```

**Error Response (404):**

```json
{
  "path": "user",
  "message": "User not found"
}
```

---

## 💳 Create Razorpay Order

### **POST** `/api/payment/create-order`

Creates a Razorpay payment order and stores a pending payment entry in the database.

### Headers

- `Authorization: Bearer <user-token>`

### Request Body

```json
{
  "plan_id": 1
}
```

### Success Response `200 OK`

```json
{
  "status": "success",
  "order_id": "order_K1Y9OQY0xyz123",
  "amount": 499,
  "currency": "INR"
}
```

### Error Responses

- `400` Invalid or inactive plan ID
- `401` Unauthorized (missing or invalid token)
- `500` Internal server error (e.g. order creation failure)

---

## ✅ Verify Razorpay Payment

### **POST** `/api/payment/verify-payment`

Verifies the payment signature from Razorpay and marks payment as successful.

### Request Body

```json
{
  "razorpay_order_id": "order_K1Y9OQY0xyz123",
  "razorpay_payment_id": "pay_K1YA3Dxyz456",
  "razorpay_signature": "abcdef1234567890"
}
```

### Success Response `200 OK`

```json
{
  "status": "success",
  "message": "Payment verified"
}
```

### Error Responses

- `400` Invalid payment signature
- `500` Internal server error

---

## 📦 Get My Payments

### **GET** `/api/payment/my-payments`

Fetches all payment records of the logged-in user.

### Headers

- `Authorization: Bearer <user-token>`

### Success Response `200 OK`

```json
{
  "status": "success",
  "payments": [
    {
      "id": 10,
      "plan_name": "Pro Plan",
      "plan_id": 1,
      "amount": 499,
      "payment_method": "UPI",
      "payment_gateway": "Razorpay",
      "gateway_order_id": "order_K1Y9OQY0xyz123",
      "gateway_payment_id": "pay_K1YA3Dxyz456",
      "gateway_signature": "abcdef1234567890",
      "status": "paid",
      "paid_at": "2025-07-29T12:00:00.000Z",
      "plan_start_date": "2025-07-29T12:00:00.000Z",
      "plan_end_date": "2026-01-29T12:00:00.000Z",
      "created_at": "2025-07-29T11:58:00.000Z",
      "metadata": {
        "user_agent": "Mozilla/5.0...",
        "ip_address": "192.168.1.10",
        "location": "Delhi, India",
        "device_type": "Mobile",
        "browser": "Chrome",
        "created_by": "user",
        "created_at": "2025-07-29T11:57:00.000Z",
        "duration_days": 180
      }
    }
  ]
}
```

### Error Responses

- `401` Unauthorized (missing or invalid token)
- `500` Could not fetch payments

---

## 📡 Razorpay Webhook (Internal)

### **POST** `/api/payment/webhook`

Handles webhook calls from Razorpay and logs the response.

> ⚠️ This route is called internally by Razorpay and does not require authentication by users.

### Headers

- `x-razorpay-signature`: Razorpay webhook signature

### Request Body (Example from Razorpay)

```json
{
  "event": "payment.captured",
  "payload": {
    "payment": {
      "entity": {
        "order_id": "order_K1Y9OQY0xyz123",
        ...
      }
    }
  }
}
```

### Success Response `200 OK`

```json
{
  "status": "Webhook verified"
}
```

### Error Response `400` Invalid signature



---

## 📃 Get All Membership Plans

### **GET** `/api/user/membershipPlans`

Fetches all membership plans (Admin only).

### Headers
- `Authorization: Bearer <admin-token>`

### Success Response `200 OK`
```json
{
  "status": "success",
  "data": [
    {
      "id": 1,
      "name": "Standard Plan",
      "description": "Perfect for professionals",
      "price": "190.00",
      "duration_in_days": 90,
      "features": ["Custom QR code", "vCard download", "Basic analytics"],
      "is_active": false,
      "created_at": "2025-07-29T17:47:11.909Z"
    }
  ]
}
```

### Error Responses
- `401` Unauthorized (Missing or invalid token)
- `500` Internal server error

---

