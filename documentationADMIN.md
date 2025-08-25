## 🔐 Admin Login

### **POST** `/api/admin/login`

Authenticate an admin using their email and password. On success, returns a JWT token which is required for accessing protected admin routes.

### Request Body
```json
{
  "email": "admin@example.com",
  "password": "adminpassword"
}
```

### Success Response `200 OK`
```json
{
  "status": "success",
  "message": "Login successful",
  "token": "your.jwt.token.here"
}
```

### Error Responses
- `400 Bad Request` — Missing email or password
```json
{
  "path": "body",
  "message": "Email and password are required"
}
```

- `401 Unauthorized` — Invalid email or password
```json
{
  "path": "credentials",
  "message": "Invalid email or password"
}
```

- `500 Internal Server Error`
```json
{
  "path": "server",
  "message": "Internal server error"
}
```

### Notes
- Email is case-insensitive and trimmed before comparison.
- The token must be included in the `Authorization` header as `Bearer <token>` for accessing other admin APIs.

---

---

## ✏️ Admin User Management APIs

### 1. Create User

**POST** `/api/admin/user/create`  
Create a new user by the admin.

**Headers**
- `Authorization: Bearer <token>`
- `Content-Type: application/json`

**Request Body**
```json
{
  "first_name": "Ajay",
  "middle_name": "Kumar",
  "last_name": "Sharma",
  "email": "ajay.sharma@example.com",
  "password": "Dummy@123",
  "dob": "1995-08-19",
  "address": "123 Main Street, Delhi, India",
  "phone_numbers": [
    { "country_code": "+91", "phone_number": "9876543210" },
    { "country_code": "+1", "phone_number": "1234567890" }
  ]
}
```

```
{
  "status": "success",
  "message": "User created successfully by admin",
  "data": {
    "id": 1,
    "first_name": "Ajay",
    "middle_name": "Kumar",
    "last_name": "Sharma",
    "full_name": "Ajay Kumar Sharma",
    "email": "ajay.sharma@example.com",
    "dob": "1995-08-19",
    "address": "123 Main Street, Delhi, India",
    "status": "active",
    "created_at": "2025-08-19T10:00:00.000Z",
    "updated_at": "2025-08-19T10:00:00.000Z",
    "phone_numbers": [
      { "id": 1, "country_code": "+91", "phone_number": "9876543210" },
      { "id": 2, "country_code": "+1", "phone_number": "1234567890" }
    ]
  }
}
```

#### Error Responses
- `400` First name is required and cannot be empty
- `400` Last name is required and cannot be empty
- `400` Valid email is required
- `400` Password is required
- `400` Invalid date format
- `400` Address must be a non-empty string
- `400` Phone numbers must be an array
- `400` Each phone_number must be a non-empty string
- `400` Country code must be a string
- `409` Email already in use
- `500` Internal server error

---

---

## ✏️ Get all User in admin

### **GET** `/api/admin/user`

### Description
Fetches a list of all registered users with their associated phone numbers.

### Headers
- `Authorization: Bearer <admin-token>`

### Response
- `200 OK`: Returns an array of user objects.

```json
{
  "status": "success",
  "message": "Users fetched successfully",
  "data": [
    {
      "id": 17,
      "first_name": "Ajay",
      "middle_name": "Kumar",
      "last_name": "Jangir",
      "full_name": "Ajay Kumar Jangir",
      "email": "ajay@example.com",
      "dob": "2002-12-14",
      "address": "Delhi, India",
      "status": "active",
      "current_plan_start": "2025-09-10T09:52:21.897Z",
      "current_plan_end": "2025-09-30T09:52:21.897Z",
      "membership_plan_id": 4,
      "created_at": "2025-08-20T07:50:52.741Z",
      "updated_at": "2025-08-21T09:53:07.831Z",
      "phone_numbers": [
        { "id": 34, "country_code": "+91", "phone_number": "9844311100" },
        { "id": 35, "country_code": "+91", "phone_number": "9125178910" },
        { "id": 36, "country_code": "+1",  "phone_number": "5121456107" }
      ],
      "active_qr_code": {
        "id": 26,
        "user_id": 17,
        "qr_code_data": "data:image/png;base64,...",
        "vcard": "BEGIN:VCARD\r\nVERSION:3.0\r\n...",
        "is_active": true,
        "expires_at": "2025-09-30T15:22:21.897191",
        "created_at": "2025-08-21T15:24:01.39809",
        "qr_disabled_by_admin": false
      },
      "active_payment": {
        "id": 41,
        "user_id": 17,
        "plan_id": 4,
        "amount": 199.99,
        "payment_method": "UPI",
        "payment_gateway": "Razorpay",
        "gateway_order_id": "order_R7wRubscGDvUQG",
        "gateway_payment_id": "pay_R7wSE3RGDVV5U5",
        "gateway_signature": "1a683e6ebd4a05ab0b417687d1101744f601d263a1c11ee0968478924dd85f92",
        "status": "paid",
        "paid_at": "2025-08-21T15:23:07.831376",
        "plan_start_date": "2025-09-10T15:22:21.897191",
        "plan_end_date": "2025-09-30T15:22:21.897191",
        "created_at": "2025-08-21T15:22:36.107233",
        "metadata": {
          "browser": "Unknown",
          "location": "undefined, undefined",
          "created_at": "2025-08-21T09:52:36.106Z",
          "created_by": "user",
          "ip_address": "127.0.0.1",
          "user_agent": "PostmanRuntime/7.45.0",
          "device_type": "Desktop",
          "duration_days": 20
        }
      },
      "plan_details": {
        "id": 4,
        "name": "Standard Plan",
        "description": "Best for professionals who want a balance of features and affordability.",
        "price": 199.99,
        "duration_in_days": 20,
        "features": [
          "Custom QR code",
          "vCard download",
          "Basic analytics"
        ],
        "is_active": true,
        "created_at": "2025-07-29T23:15:23.775024"
      }
    }
  ]
}

```

---

## ✏️ Update User in admin

### **PUT** `/api/admin/user/:id`

Update details of a specific user.

### Headers
- `Authorization: Bearer <admin-token>`

#### Request Body (partial updates allowed)
```json
{
  "first_name": "Ajay",
  "last_name": "Verma",
  "dob": "1999-12-12",
  "address": "New Address"
}
```

#### Success Response `200 OK`
```json
{
  "status": "success",
  "message": "User updated successfully"
}
```

#### Error Responses
- `401` Unauthorized (Missing or invalid token)
- `404` User not found
- `500` Internal server error

---

## ❌ Delete User

### **DELETE** `/api/admin/user/:id`

Deletes a single user by ID.

### Headers
- `Authorization: Bearer <admin-token>`

#### Success Response `200 OK`
```json
{
  "status": "success",
  "message": "User deleted successfully"
}
```

#### Error Responses
- `401` Unauthorized (Missing or invalid token)
- `404` User not found
- `500` Internal server error

---

## 🗑️ Mass Delete Users

### **POST** `/api/admin/user`

Deletes multiple users by IDs.

### Headers
- `Authorization: Bearer <admin-token>`

#### Request Body
```json
{
  "user_ids": [1, 2, 3]
}
```

#### Success Response `200 OK`
```json
{
  "status": "success",
  "message": "Users deleted successfully"
}
```

#### Error Responses
- `401` Unauthorized (Missing or invalid token)
- `400` Invalid or missing IDs array
- `500` Internal server error

---


## 📥 Create Membership Plan

### **POST** `/api/admin/plans/create`

Creates a new membership plan (Admin only).

### Headers
- `Authorization: Bearer <admin-token>`

### Request Body
```json
{
  "name": "Standard Plan",
  "description": "Perfect for professionals",
  "price": 190,
  "duration_in_days": 90,
  "features": [
    "Custom QR code",
    "vCard download",
    "Basic analytics"
  ],
  "is_active": false,  // boolean can be true and false and its by default false

}
```

### Success Response `201 Created`
```json
{
  "status": "success",
  "message": "Membership plan created successfully",
  "data": {
    "id": 1,
    "name": "Standard Plan",
    "description": "Perfect for professionals",
    "price": "190.00",
    "duration_in_days": 90,
    "features": [
      "Custom QR code",
      "vCard download",
      "Basic analytics"
    ],
    "is_active": false,
    "created_at": "2025-07-29T17:47:11.909Z"
  }
}
```

### Error Responses
- `400` Validation error (e.g., missing or invalid fields)
- `409` Duplicate plan exists
- `401` Unauthorized (Missing or invalid token)
- `500` Internal server error

---

---

## 📃 Get All Membership Plans

### **GET** `/api/admin/plans`

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

## ✏️ Update Membership Plan

### **PUT** `/api/admin/plans/:id`

Updates an existing membership plan by ID (Admin only).

### Headers
- `Authorization: Bearer <admin-token>`

### Request Body
```json
{
  "name": "Updated Plan",
  "description": "Updated description",
  "price": 250,
  "duration_in_days": 180,
  "features": [
    "Advanced analytics",
    "Priority support"
  ],
  "is_active": true
}
```

### Success Response `200 OK`
```json
{
  "status": "success",
  "message": "Membership plan updated successfully",
  "data": {
    "id": 1,
    "name": "Updated Plan",
    "description": "Updated description",
    "price": "250.00",
    "duration_in_days": 180,
    "features": ["Advanced analytics", "Priority support"],
    "is_active": true,
    "created_at": "2025-07-29T17:47:11.909Z"
  }
}
```

### Error Responses
- `400` Validation error or missing fields
- `404` Plan not found
- `401` Unauthorized (Missing or invalid token)
- `500` Internal server error

---

## 🗑️ Delete Membership Plan

### **DELETE** `/api/admin/plans/:id`

Deletes a membership plan by ID (Admin only).

### Headers
- `Authorization: Bearer <admin-token>`

### Success Response `200 OK`
```json
{
  "status": "success",
  "message": "Membership plan deleted successfully"
}
```

### Error Responses
- `404` Plan not found
- `401` Unauthorized (Missing or invalid token)
- `500` Internal server error
