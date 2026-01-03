from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from pymongo import MongoClient
from pydantic import BaseModel
from typing import Optional
import jwt
import bcrypt
from datetime import datetime, timedelta
import os
from bson import ObjectId

app = FastAPI(title="Dayflow HRMS API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MONGODB_URI = "mongodb://localhost:27017/dayflow-hr"
JWT_SECRET = "sun_shine_from_the_east"

try:
    client = MongoClient(MONGODB_URI)
    db = client["dayflow-hr"]
    client.admin.command('ping')
    print("✅ Connected to MongoDB successfully!")
except Exception as e:
    print(f"❌ MongoDB connection failed: {e}")
    raise

class LoginRequest(BaseModel):
    email: str
    password: str

class CreateEmployeeRequest(BaseModel):
    firstName: str
    lastName: str
    email: str
    phone: Optional[str] = None
    department: str
    position: str
    salary: dict
    password: str

class UpdateEmployeeRequest(BaseModel):
    firstName: Optional[str] = None
    lastName: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    department: Optional[str] = None
    position: Optional[str] = None
    salary: Optional[dict] = None
    status: Optional[str] = None

class CreateLeaveRequest(BaseModel):
    leaveType: str
    startDate: str
    endDate: str
    days: int
    reason: str

class UpdateLeaveRequest(BaseModel):
    status: str
    comments: Optional[str] = None

class GeneratePayrollRequest(BaseModel):
    month: int
    year: int
    employeeIds: Optional[list] = None  # If None, generate for all employees

class UpdatePayrollRequest(BaseModel):
    bonus: Optional[float] = None
    deductions: Optional[float] = None
    status: Optional[str] = None
    remarks: Optional[str] = None

class ChangePasswordRequest(BaseModel):
    currentPassword: Optional[str] = None  # Required for employees changing own password
    newPassword: str

class ResetPasswordRequest(BaseModel):
    employeeId: str
    newPassword: str

class CreateLeaveTypeRequest(BaseModel):
    name: str
    code: str  # Short code like "CL", "SL", "AL"
    totalDays: int
    description: Optional[str] = None
    carryForward: Optional[bool] = False  # Can unused days be carried forward?
    maxCarryForward: Optional[int] = 0  # Max days that can be carried forward
    isPaid: Optional[bool] = True
    isActive: Optional[bool] = True

class UpdateLeaveTypeRequest(BaseModel):
    name: Optional[str] = None
    totalDays: Optional[int] = None
    description: Optional[str] = None
    carryForward: Optional[bool] = None
    maxCarryForward: Optional[int] = None
    isPaid: Optional[bool] = None
    isActive: Optional[bool] = None

security = HTTPBearer(auto_error=False)

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        raise HTTPException(status_code=401, detail="Authorization header missing")
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=["HS256"])
        user_id = payload.get("id")
        user = db.users.find_one({"_id": ObjectId(user_id)})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        
        # Check if user account is active - block all operations for inactive users
        if user.get("isActive") == False:
            raise HTTPException(status_code=403, detail="Your account has been deactivated. Please contact HR.")
        
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    except HTTPException:
        raise
    except Exception as e:
        print(f"Auth error: {e}")
        raise HTTPException(status_code=401, detail="Authentication failed")

@app.get("/api/health")
def health_check():
    try:
        client.admin.command('ping')
        return {"status": "ok", "database": "connected"}
    except Exception as e:
        return {"status": "error", "database": "disconnected", "error": str(e)}

@app.get("/api/seed")
def seed_data():
    """Create default HR user if none exists"""
    try:
        existing_hr = db.users.find_one({"role": "hr"})
        if existing_hr:
            return {"success": True, "message": "HR user already exists", "email": existing_hr["email"]}
        
        hashed_password = bcrypt.hashpw("admin123".encode(), bcrypt.gensalt()).decode()
        
        hr_user = {
            "employeeId": "EMP001",
            "email": "admin@dayflow.com",
            "password": hashed_password,
            "role": "hr",
            "isActive": True,
            "createdAt": datetime.utcnow()
        }
        
        db.users.insert_one(hr_user)
        
        # Also create employee record
        employee = {
            "employeeId": "EMP001",
            "firstName": "Admin",
            "lastName": "User",
            "email": "admin@dayflow.com",
            "phone": "1234567890",
            "department": "Human Resources",
            "position": "HR Manager",
            "joinDate": datetime.utcnow(),
            "status": "active",
            "salary": {"basic": 80000, "allowances": 10000, "deductions": 5000}
        }
        db.employees.insert_one(employee)
        
        return {
            "success": True,
            "message": "Default HR user created",
            "email": "admin@dayflow.com",
            "password": "admin123"
        }
    except Exception as e:
        print(f"Seed error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to seed data: {str(e)}")

@app.post("/api/auth/login")
def login(request: LoginRequest):
    try:
        print(f"Login attempt for: {request.email}")
        
        # Try to find user with or without isActive flag
        user = db.users.find_one({"email": request.email})
        if not user:
            print(f"User not found: {request.email}")
            raise HTTPException(status_code=401, detail="Invalid email or password")
        
        # Check if user is active (if the field exists)
        if user.get("isActive") == False:
            raise HTTPException(status_code=401, detail="Account is disabled")
        
        if not bcrypt.checkpw(request.password.encode(), user["password"].encode()):
            print(f"Invalid password for: {request.email}")
            raise HTTPException(status_code=401, detail="Invalid email or password")
        
        token = jwt.encode({
            "id": str(user["_id"]),
            "employeeId": user["employeeId"],
            "role": user["role"],
            "exp": datetime.utcnow() + timedelta(days=30)
        }, JWT_SECRET, algorithm="HS256")
        
        return {
            "success": True,
            "token": token,
            "user": {
                "id": str(user["_id"]),
                "employeeId": user["employeeId"],
                "email": user["email"],
                "role": user["role"]
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Login error: {e}")
        raise HTTPException(status_code=500, detail="Login failed")

@app.get("/api/auth/profile")
def get_profile(current_user: dict = Depends(get_current_user)):
    try:
        employee = db.employees.find_one({"employeeId": current_user["employeeId"]})
        if not employee:
            raise HTTPException(status_code=404, detail="Employee profile not found")
        
        employee["_id"] = str(employee["_id"])
        return {"success": True, "data": employee}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Profile error: {e}")
        raise HTTPException(status_code=500, detail="Failed to get profile")

@app.get("/api/employees")
def get_employees(current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["hr", "admin"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    try:
        employees = []
        # Fetch only non-HR department employees
        for emp in db.employees.find({"department": {"$ne": "Human Resources"}}):
            emp["_id"] = str(emp["_id"])
            employees.append(emp)
        
        return {"success": True, "data": employees}
    except Exception as e:
        print(f"Get employees error: {e}")
        raise HTTPException(status_code=500, detail="Failed to get employees")

@app.post("/api/employees")
def create_employee(request: CreateEmployeeRequest, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["hr"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    try:
        print(f"Creating employee with data: {request.dict()}")
        
        if db.users.find_one({"email": request.email}):
            raise HTTPException(status_code=400, detail="Email already exists")
        
        # Generate unique employee ID
        existing_ids = [user["employeeId"] for user in db.users.find({}, {"employeeId": 1})]
        count = 1
        while True:
            employee_id = f"EMP{str(count).zfill(3)}"
            if employee_id not in existing_ids:
                break
            count += 1
        hashed_password = bcrypt.hashpw(request.password.encode(), bcrypt.gensalt()).decode()
        
        user_data = {
            "employeeId": employee_id,
            "email": request.email,
            "password": hashed_password,
            "role": "employee",
            "isActive": True,
            "createdAt": datetime.utcnow()
        }
        db.users.insert_one(user_data)
        
        employee_data = {
            "employeeId": employee_id,
            "firstName": request.firstName,
            "lastName": request.lastName,
            "email": request.email,
            "phone": request.phone or "",
            "department": request.department,
            "position": request.position,
            "salary": request.salary,
            "status": "active",
            "profilePicture": "/placeholder.svg",
            "dateOfJoining": datetime.utcnow(),
            "createdAt": datetime.utcnow()
        }
        db.employees.insert_one(employee_data)
        
        return {
            "success": True, 
            "employeeId": employee_id,
            "message": "Employee created successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Create employee error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to create employee: {str(e)}")

@app.get("/api/employees/{employee_id}")
def get_employee(employee_id: str, current_user: dict = Depends(get_current_user)):
    try:
        employee = db.employees.find_one({"employeeId": employee_id})
        if not employee:
            raise HTTPException(status_code=404, detail="Employee not found")
        
        employee["_id"] = str(employee["_id"])
        return {"success": True, "data": employee}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Get employee error: {e}")
        raise HTTPException(status_code=500, detail="Failed to get employee")

@app.put("/api/employees/{employee_id}")
def update_employee(employee_id: str, request: UpdateEmployeeRequest, current_user: dict = Depends(get_current_user)):
    is_hr = current_user["role"] in ["hr", "admin"]
    is_own_profile = current_user["employeeId"] == employee_id
    
    # Employees can only update their own profile, HR can update anyone
    if not is_hr and not is_own_profile:
        raise HTTPException(status_code=403, detail="You can only update your own profile")
    
    try:
        # Build update data from non-None fields
        update_data = {}
        
        # Fields that employees can update for themselves
        if request.firstName is not None:
            update_data["firstName"] = request.firstName
        if request.lastName is not None:
            update_data["lastName"] = request.lastName
        if request.phone is not None:
            update_data["phone"] = request.phone
        
        # Fields that only HR can update
        if request.email is not None:
            if not is_hr:
                raise HTTPException(status_code=403, detail="Only HR can update email")
            # Check if email is already taken by another employee
            existing = db.employees.find_one({"email": request.email, "employeeId": {"$ne": employee_id}})
            if existing:
                raise HTTPException(status_code=400, detail="Email already exists")
            update_data["email"] = request.email
            # Also update email in users collection
            db.users.update_one({"employeeId": employee_id}, {"$set": {"email": request.email}})
        
        if request.department is not None:
            if not is_hr:
                raise HTTPException(status_code=403, detail="Only HR can update department")
            update_data["department"] = request.department
        
        if request.position is not None:
            if not is_hr:
                raise HTTPException(status_code=403, detail="Only HR can update position")
            update_data["position"] = request.position
        
        if request.salary is not None:
            if not is_hr:
                raise HTTPException(status_code=403, detail="Only HR can update salary")
            update_data["salary"] = request.salary
        
        if request.status is not None:
            if not is_hr:
                raise HTTPException(status_code=403, detail="Only HR can update status")
            update_data["status"] = request.status
            # Also update isActive in users collection
            db.users.update_one({"employeeId": employee_id}, {"$set": {"isActive": request.status == "active"}})
        
        if not update_data:
            raise HTTPException(status_code=400, detail="No fields to update")
        
        update_data["updatedAt"] = datetime.utcnow()
        
        result = db.employees.update_one(
            {"employeeId": employee_id},
            {"$set": update_data}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Employee not found")
        
        return {"success": True, "message": "Employee updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Update employee error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update employee: {str(e)}")

@app.delete("/api/employees/{employee_id}")
def delete_employee(employee_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["hr", "admin"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    try:
        # Don't allow deleting yourself
        if current_user["employeeId"] == employee_id:
            raise HTTPException(status_code=400, detail="Cannot delete your own account")
        
        # Delete from employees collection
        result = db.employees.delete_one({"employeeId": employee_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Employee not found")
        
        # Delete from users collection
        db.users.delete_one({"employeeId": employee_id})
        
        return {"success": True, "message": "Employee deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Delete employee error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete employee: {str(e)}")

@app.put("/api/employees/{employee_id}/password")
def change_employee_password(employee_id: str, request: ChangePasswordRequest, current_user: dict = Depends(get_current_user)):
    """Change employee password - employees can change own, HR can change any"""
    try:
        # Check authorization
        is_own_account = current_user["employeeId"] == employee_id
        is_hr = current_user["role"] in ["hr", "admin"]
        
        if not is_own_account and not is_hr:
            raise HTTPException(status_code=403, detail="You can only change your own password")
        
        # Find the user
        user = db.users.find_one({"employeeId": employee_id})
        if not user:
            raise HTTPException(status_code=404, detail="Employee not found")
        
        # If employee changing own password, verify current password
        if is_own_account and not is_hr:
            if not request.currentPassword:
                raise HTTPException(status_code=400, detail="Current password is required")
            if not bcrypt.checkpw(request.currentPassword.encode(), user["password"].encode()):
                raise HTTPException(status_code=400, detail="Current password is incorrect")
        
        # Validate new password
        if len(request.newPassword) < 6:
            raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
        
        # Hash and update password
        hashed_password = bcrypt.hashpw(request.newPassword.encode(), bcrypt.gensalt()).decode()
        
        db.users.update_one(
            {"employeeId": employee_id},
            {"$set": {"password": hashed_password, "passwordUpdatedAt": datetime.utcnow()}}
        )
        
        return {"success": True, "message": "Password updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Change password error: {e}")
        raise HTTPException(status_code=500, detail="Failed to change password")

@app.post("/api/auth/reset-password")
def reset_password(request: ResetPasswordRequest, current_user: dict = Depends(get_current_user)):
    """Reset employee password (HR only)"""
    if current_user["role"] not in ["hr", "admin"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    try:
        # Find the user
        user = db.users.find_one({"employeeId": request.employeeId})
        if not user:
            raise HTTPException(status_code=404, detail="Employee not found")
        
        # Validate new password
        if len(request.newPassword) < 6:
            raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
        
        # Hash and update password
        hashed_password = bcrypt.hashpw(request.newPassword.encode(), bcrypt.gensalt()).decode()
        
        db.users.update_one(
            {"employeeId": request.employeeId},
            {"$set": {
                "password": hashed_password, 
                "passwordUpdatedAt": datetime.utcnow(),
                "passwordResetBy": current_user["employeeId"]
            }}
        )
        
        return {"success": True, "message": f"Password reset successfully for {request.employeeId}"}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Reset password error: {e}")
        raise HTTPException(status_code=500, detail="Failed to reset password")

@app.get("/api/attendance")
def get_attendance(date: Optional[str] = None, employeeId: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    try:
        query = {}
        if date:
            query["date"] = date
        
        # If specific employeeId is requested (HR only) or employee viewing their own
        if employeeId and current_user["role"] in ["hr", "admin"]:
            query["employeeId"] = employeeId
        elif current_user["role"] == "employee":
            query["employeeId"] = current_user["employeeId"]
        
        attendance = []
        for att in db.attendance.find(query).sort("date", -1):
            att["_id"] = str(att["_id"])
            
            # Fetch employee details if not stored
            if "employeeName" not in att or not att.get("employeeName"):
                employee = db.employees.find_one({"employeeId": att["employeeId"]})
                if employee:
                    att["employeeName"] = f"{employee.get('firstName', '')} {employee.get('lastName', '')}"
                    att["department"] = employee.get("department", "")
                else:
                    att["employeeName"] = "Unknown"
                    att["department"] = ""
            
            attendance.append(att)
        
        return {"success": True, "data": attendance}
    except Exception as e:
        print(f"Get attendance error: {e}")
        raise HTTPException(status_code=500, detail="Failed to get attendance")

@app.get("/api/attendance/today")
def get_today_attendance(current_user: dict = Depends(get_current_user)):
    """Get current user's attendance for today"""
    try:
        today = datetime.now().strftime("%Y-%m-%d")
        attendance = db.attendance.find_one({"employeeId": current_user["employeeId"], "date": today})
        
        if attendance:
            attendance["_id"] = str(attendance["_id"])
            return {"success": True, "data": attendance, "hasCheckedIn": True, "hasCheckedOut": attendance.get("checkOut") is not None}
        
        return {"success": True, "data": None, "hasCheckedIn": False, "hasCheckedOut": False}
    except Exception as e:
        print(f"Get today attendance error: {e}")
        raise HTTPException(status_code=500, detail="Failed to get today's attendance")

@app.post("/api/attendance/checkin")
def check_in(current_user: dict = Depends(get_current_user)):
    try:
        today = datetime.now().strftime("%Y-%m-%d")
        existing = db.attendance.find_one({"employeeId": current_user["employeeId"], "date": today})
        
        if existing:
            raise HTTPException(status_code=400, detail="Already checked in today")
        
        # Fetch employee details
        employee = db.employees.find_one({"employeeId": current_user["employeeId"]})
        employee_name = "Unknown"
        department = ""
        if employee:
            employee_name = f"{employee.get('firstName', '')} {employee.get('lastName', '')}"
            department = employee.get("department", "")
        
        check_in_time = datetime.now()
        attendance_data = {
            "employeeId": current_user["employeeId"],
            "employeeName": employee_name,
            "department": department,
            "date": today,
            "checkIn": check_in_time.strftime("%H:%M"),
            "checkInTime": check_in_time,
            "checkOut": None,
            "checkOutTime": None,
            "status": "present",
            "workingHours": 0,
            "createdAt": datetime.utcnow()
        }
        
        db.attendance.insert_one(attendance_data)
        return {
            "success": True, 
            "message": "Checked in successfully",
            "checkIn": check_in_time.strftime("%H:%M"),
            "date": today
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Check in error: {e}")
        raise HTTPException(status_code=500, detail="Failed to check in")

@app.post("/api/attendance/checkout")
def check_out(current_user: dict = Depends(get_current_user)):
    try:
        today = datetime.now().strftime("%Y-%m-%d")
        existing = db.attendance.find_one({"employeeId": current_user["employeeId"], "date": today})
        
        if not existing:
            raise HTTPException(status_code=400, detail="You haven't checked in today")
        
        if existing.get("checkOut"):
            raise HTTPException(status_code=400, detail="Already checked out today")
        
        check_out_time = datetime.now()
        check_in_time = existing.get("checkInTime") or datetime.strptime(f"{today} {existing['checkIn']}", "%Y-%m-%d %H:%M")
        
        # Calculate working hours
        time_diff = check_out_time - check_in_time
        working_hours = round(time_diff.total_seconds() / 3600, 2)
        
        # Determine status based on working hours
        status = "present"
        if working_hours < 4:
            status = "half-day"
        elif working_hours >= 8:
            status = "present"
        
        update_data = {
            "checkOut": check_out_time.strftime("%H:%M"),
            "checkOutTime": check_out_time,
            "workingHours": working_hours,
            "status": status,
            "updatedAt": datetime.utcnow()
        }
        
        db.attendance.update_one(
            {"_id": existing["_id"]},
            {"$set": update_data}
        )
        
        return {
            "success": True, 
            "message": "Checked out successfully",
            "checkOut": check_out_time.strftime("%H:%M"),
            "workingHours": working_hours,
            "status": status
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Check out error: {e}")
        raise HTTPException(status_code=500, detail="Failed to check out")

@app.get("/api/attendance/employee/{employee_id}")
def get_employee_attendance(employee_id: str, month: Optional[int] = None, year: Optional[int] = None, current_user: dict = Depends(get_current_user)):
    """Get a specific employee's attendance history (HR/Admin only, or own records)"""
    try:
        # Check authorization - employees can only view their own
        if current_user["role"] == "employee" and current_user["employeeId"] != employee_id:
            raise HTTPException(status_code=403, detail="You can only view your own attendance")
        
        # Build query
        query = {"employeeId": employee_id}
        
        # Optional date filtering
        if month and year:
            start_date = f"{year}-{str(month).zfill(2)}-01"
            if month == 12:
                end_date = f"{year + 1}-01-01"
            else:
                end_date = f"{year}-{str(month + 1).zfill(2)}-01"
            query["date"] = {"$gte": start_date, "$lt": end_date}
        
        # Get employee info
        employee = db.employees.find_one({"employeeId": employee_id})
        if not employee:
            raise HTTPException(status_code=404, detail="Employee not found")
        
        attendance_records = []
        for att in db.attendance.find(query).sort("date", -1):
            att["_id"] = str(att["_id"])
            attendance_records.append(att)
        
        # Calculate summary
        total_days = len(attendance_records)
        present_days = len([a for a in attendance_records if a.get("status") == "present"])
        half_days = len([a for a in attendance_records if a.get("status") == "half-day"])
        absent_days = len([a for a in attendance_records if a.get("status") == "absent"])
        total_hours = sum([a.get("workingHours", 0) for a in attendance_records])
        
        return {
            "success": True,
            "data": {
                "employee": {
                    "employeeId": employee_id,
                    "name": f"{employee.get('firstName', '')} {employee.get('lastName', '')}",
                    "department": employee.get("department", ""),
                    "position": employee.get("position", "")
                },
                "summary": {
                    "totalDays": total_days,
                    "presentDays": present_days,
                    "halfDays": half_days,
                    "absentDays": absent_days,
                    "totalHours": round(total_hours, 2),
                    "averageHours": round(total_hours / total_days, 2) if total_days > 0 else 0
                },
                "records": attendance_records
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Get employee attendance error: {e}")
        raise HTTPException(status_code=500, detail="Failed to get employee attendance")

@app.get("/api/attendance/summary")
def get_attendance_summary(month: Optional[int] = None, year: Optional[int] = None, employeeId: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    """Get attendance summary for current user or all employees (HR only)"""
    try:
        now = datetime.now()
        target_month = month or now.month
        target_year = year or now.year
        
        # Build date range for the month
        start_date = f"{target_year}-{str(target_month).zfill(2)}-01"
        if target_month == 12:
            end_date = f"{target_year + 1}-01-01"
        else:
            end_date = f"{target_year}-{str(target_month + 1).zfill(2)}-01"
        
        query = {"date": {"$gte": start_date, "$lt": end_date}}
        
        # HR can filter by specific employee or see all
        if employeeId and current_user["role"] in ["hr", "admin"]:
            query["employeeId"] = employeeId
        elif current_user["role"] == "employee":
            query["employeeId"] = current_user["employeeId"]
        
        attendance_records = list(db.attendance.find(query))
        
        # Calculate summary
        total_days = len(attendance_records)
        present_days = len([a for a in attendance_records if a.get("status") == "present"])
        half_days = len([a for a in attendance_records if a.get("status") == "half-day"])
        absent_days = len([a for a in attendance_records if a.get("status") == "absent"])
        total_hours = sum([a.get("workingHours", 0) for a in attendance_records])
        avg_hours = round(total_hours / total_days, 2) if total_days > 0 else 0
        
        return {
            "success": True,
            "data": {
                "month": target_month,
                "year": target_year,
                "totalDays": total_days,
                "presentDays": present_days,
                "halfDays": half_days,
                "absentDays": absent_days,
                "totalHours": round(total_hours, 2),
                "averageHours": avg_hours
            }
        }
    except Exception as e:
        print(f"Get attendance summary error: {e}")
        raise HTTPException(status_code=500, detail="Failed to get attendance summary")

@app.get("/api/leave")
def get_leave_requests(current_user: dict = Depends(get_current_user)):
    try:
        query = {}
        if current_user["role"] == "employee":
            query["employeeId"] = current_user["employeeId"]
        
        leaves = []
        for leave in db.leaverequests.find(query):
            leave["_id"] = str(leave["_id"])
            
            # If employee details not stored in leave request, fetch dynamically
            if "employeeName" not in leave or not leave["employeeName"]:
                employee = db.employees.find_one({"employeeId": leave["employeeId"]})
                if employee:
                    leave["employeeName"] = f"{employee.get('firstName', '')} {employee.get('lastName', '')}"
                    leave["department"] = employee.get("department", "")
                    leave["position"] = employee.get("position", "")
                    leave["email"] = employee.get("email", "")
                else:
                    leave["employeeName"] = "Unknown"
                    leave["department"] = ""
                    leave["position"] = ""
                    leave["email"] = ""
            
            leaves.append(leave)
        
        return {"success": True, "data": leaves}
    except Exception as e:
        print(f"Get leave requests error: {e}")
        raise HTTPException(status_code=500, detail="Failed to get leave requests")

@app.post("/api/leave")
def create_leave_request(request: CreateLeaveRequest, current_user: dict = Depends(get_current_user)):
    try:
        # Fetch employee details to store with leave request
        employee = db.employees.find_one({"employeeId": current_user["employeeId"]})
        employee_name = "Unknown"
        department = ""
        position = ""
        email = ""
        
        if employee:
            employee_name = f"{employee.get('firstName', '')} {employee.get('lastName', '')}"
            department = employee.get("department", "")
            position = employee.get("position", "")
            email = employee.get("email", "")
        
        leave_data = {
            "employeeId": current_user["employeeId"],
            "employeeName": employee_name,
            "department": department,
            "position": position,
            "email": email,
            "leaveType": request.leaveType,
            "startDate": request.startDate,
            "endDate": request.endDate,
            "days": request.days,
            "reason": request.reason,
            "status": "pending",
            "appliedDate": datetime.utcnow(),
            "createdAt": datetime.utcnow()
        }
        
        result = db.leaverequests.insert_one(leave_data)
        return {
            "success": True,
            "id": str(result.inserted_id),
            "message": "Leave request submitted successfully"
        }
    except Exception as e:
        print(f"Create leave request error: {e}")
        raise HTTPException(status_code=500, detail="Failed to create leave request")

@app.put("/api/leave/{leave_id}")
def update_leave_request(leave_id: str, request: UpdateLeaveRequest, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["hr"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    try:
        update_data = {
            "status": request.status,
            "approvedBy": current_user["employeeId"],
            "approvedDate": datetime.utcnow()
        }
        
        if request.comments:
            update_data["comments"] = request.comments
        
        result = db.leaverequests.update_one(
            {"_id": ObjectId(leave_id)},
            {"$set": update_data}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Leave request not found")
        
        return {"success": True, "message": f"Leave request {request.status}"}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Update leave request error: {e}")
        raise HTTPException(status_code=500, detail="Failed to update leave request")


@app.get("/api/payroll")
def get_payroll(month: Optional[int] = None, year: Optional[int] = None, employeeId: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    """Get payroll records - HR sees all, employees see their own"""
    try:
        query = {}
        
        # Filter by month/year if provided
        if month:
            query["month"] = month
        if year:
            query["year"] = year
        
        # HR can filter by specific employee or see all
        if employeeId and current_user["role"] in ["hr", "admin"]:
            query["employeeId"] = employeeId
        elif current_user["role"] == "employee":
            query["employeeId"] = current_user["employeeId"]
        
        payroll_records = []
        for record in db.payroll.find(query).sort([("year", -1), ("month", -1)]):
            record["_id"] = str(record["_id"])
            payroll_records.append(record)
        
        return {"success": True, "data": payroll_records}
    except Exception as e:
        print(f"Get payroll error: {e}")
        raise HTTPException(status_code=500, detail="Failed to get payroll records")

@app.post("/api/payroll/generate")
def generate_payroll(request: GeneratePayrollRequest, current_user: dict = Depends(get_current_user)):
    """Generate payroll for a specific month (HR only)"""
    if current_user["role"] not in ["hr", "admin"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    try:
        # Validate month/year
        if request.month < 1 or request.month > 12:
            raise HTTPException(status_code=400, detail="Invalid month")
        if request.year < 2020 or request.year > 2030:
            raise HTTPException(status_code=400, detail="Invalid year")
        
        # Get employees to generate payroll for (exclude HR and inactive employees)
        employee_query = {
            "department": {"$ne": "Human Resources"},
            "status": "active"  # Only active employees get paid
        }
        if request.employeeIds:
            employee_query["employeeId"] = {"$in": request.employeeIds}
        
        employees = list(db.employees.find(employee_query))
        
        if not employees:
            raise HTTPException(status_code=404, detail="No employees found")
        
        generated_count = 0
        skipped_count = 0
        payroll_records = []
        
        for emp in employees:
            try:
                # Check if payroll already exists for this month
                existing = db.payroll.find_one({
                    "employeeId": emp["employeeId"],
                    "month": request.month,
                    "year": request.year
                })
                
                if existing:
                    skipped_count += 1
                    continue
                
                # Get salary details - handle different formats
                salary = emp.get("salary", {})
                
                # Handle case where salary might be a number instead of dict
                if isinstance(salary, (int, float)):
                    basic_salary = salary
                    allowances = 0
                    deductions = 0
                elif isinstance(salary, dict):
                    # Check for basicSalary, basic, or amount (in order of priority)
                    basic_salary = salary.get("basicSalary", 0) or salary.get("basic", 0) or salary.get("amount", 0) or 0
                    allowances = salary.get("allowances", 0)
                    # Handle nested allowances
                    if isinstance(allowances, dict):
                        allowances = sum(allowances.values()) if allowances else 0
                    deductions = salary.get("deductions", 0)
                    # Handle nested deductions
                    if isinstance(deductions, dict):
                        deductions = sum(deductions.values()) if deductions else 0
                else:
                    basic_salary = 0
                    allowances = 0
                    deductions = 0
                
                # Ensure all values are numbers
                basic_salary = float(basic_salary) if basic_salary else 0
                allowances = float(allowances) if allowances else 0
                deductions = float(deductions) if deductions else 0
                
                # Calculate attendance-based deductions
                start_date = f"{request.year}-{str(request.month).zfill(2)}-01"
                if request.month == 12:
                    end_date = f"{request.year + 1}-01-01"
                else:
                    end_date = f"{request.year}-{str(request.month + 1).zfill(2)}-01"
                
                attendance_records = list(db.attendance.find({
                    "employeeId": emp["employeeId"],
                    "date": {"$gte": start_date, "$lt": end_date}
                }))
                
                working_days = len(attendance_records)
                present_days = len([a for a in attendance_records if a.get("status") == "present"])
                half_days = len([a for a in attendance_records if a.get("status") == "half-day"])
                absent_days = len([a for a in attendance_records if a.get("status") == "absent"])
                total_hours = sum([float(a.get("workingHours", 0) or 0) for a in attendance_records])
                
                # Calculate gross and net salary
                gross_salary = basic_salary + allowances
                
                # Deduct for absent days (per day = basic/30) - avoid division by zero
                per_day_salary = basic_salary / 30 if basic_salary > 0 else 0
                absent_deduction = absent_days * per_day_salary
                half_day_deduction = half_days * (per_day_salary / 2)
                
                total_deductions = deductions + absent_deduction + half_day_deduction
                net_salary = gross_salary - total_deductions
                
                payroll_data = {
                    "employeeId": emp["employeeId"],
                    "employeeName": f"{emp.get('firstName', '')} {emp.get('lastName', '')}",
                    "department": emp.get("department", ""),
                    "position": emp.get("position", ""),
                    "month": request.month,
                    "year": request.year,
                    "payPeriod": f"{request.year}-{str(request.month).zfill(2)}",
                    "basicSalary": basic_salary,
                    "allowances": allowances,
                    "grossSalary": gross_salary,
                    "deductions": {
                        "standard": deductions,
                        "absentDeduction": round(absent_deduction, 2),
                        "halfDayDeduction": round(half_day_deduction, 2),
                        "total": round(total_deductions, 2)
                    },
                    "netSalary": round(net_salary, 2),
                    "attendance": {
                        "workingDays": working_days,
                        "presentDays": present_days,
                        "halfDays": half_days,
                        "absentDays": absent_days,
                        "totalHours": round(total_hours, 2)
                    },
                    "bonus": 0,
                    "status": "generated",
                    "generatedBy": current_user["employeeId"],
                    "generatedAt": datetime.utcnow(),
                    "createdAt": datetime.utcnow()
                }
                
                result = db.payroll.insert_one(payroll_data)
                payroll_data["_id"] = str(result.inserted_id)
                payroll_records.append(payroll_data)
                generated_count += 1
            except Exception as emp_error:
                print(f"Error processing employee {emp.get('employeeId', 'unknown')}: {emp_error}")
                continue
        
        return {
            "success": True,
            "message": f"Payroll generated for {generated_count} employees",
            "generated": generated_count,
            "skipped": skipped_count,
            "data": payroll_records
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Generate payroll error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to generate payroll: {str(e)}")

@app.get("/api/payroll/employee/{employee_id}")
def get_employee_payroll(employee_id: str, current_user: dict = Depends(get_current_user)):
    """Get a specific employee's payroll history"""
    try:
        # Employees can only view their own payroll
        if current_user["role"] == "employee" and current_user["employeeId"] != employee_id:
            raise HTTPException(status_code=403, detail="You can only view your own payroll")
        
        # Get employee info
        employee = db.employees.find_one({"employeeId": employee_id})
        if not employee:
            raise HTTPException(status_code=404, detail="Employee not found")
        
        payroll_records = []
        for record in db.payroll.find({"employeeId": employee_id}).sort([("year", -1), ("month", -1)]):
            record["_id"] = str(record["_id"])
            payroll_records.append(record)
        
        # Calculate totals
        total_earned = sum([r.get("netSalary", 0) for r in payroll_records])
        total_bonus = sum([r.get("bonus", 0) for r in payroll_records])
        
        return {
            "success": True,
            "data": {
                "employee": {
                    "employeeId": employee_id,
                    "name": f"{employee.get('firstName', '')} {employee.get('lastName', '')}",
                    "department": employee.get("department", ""),
                    "position": employee.get("position", "")
                },
                "summary": {
                    "totalRecords": len(payroll_records),
                    "totalEarned": round(total_earned, 2),
                    "totalBonus": round(total_bonus, 2)
                },
                "records": payroll_records
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Get employee payroll error: {e}")
        raise HTTPException(status_code=500, detail="Failed to get employee payroll")

@app.get("/api/payroll/slip/{payroll_id}")
def get_payslip(payroll_id: str, current_user: dict = Depends(get_current_user)):
    """Get a specific payslip"""
    try:
        payroll = db.payroll.find_one({"_id": ObjectId(payroll_id)})
        if not payroll:
            raise HTTPException(status_code=404, detail="Payslip not found")
        
        # Employees can only view their own payslip
        if current_user["role"] == "employee" and payroll["employeeId"] != current_user["employeeId"]:
            raise HTTPException(status_code=403, detail="You can only view your own payslip")
        
        payroll["_id"] = str(payroll["_id"])
        
        # Get employee details for complete slip
        employee = db.employees.find_one({"employeeId": payroll["employeeId"]})
        if employee:
            payroll["employeeDetails"] = {
                "email": employee.get("email", ""),
                "phone": employee.get("phone", ""),
                "joinDate": str(employee.get("dateOfJoining", ""))
            }
        
        return {"success": True, "data": payroll}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Get payslip error: {e}")
        raise HTTPException(status_code=500, detail="Failed to get payslip")

@app.put("/api/payroll/{payroll_id}")
def update_payroll(payroll_id: str, request: UpdatePayrollRequest, current_user: dict = Depends(get_current_user)):
    """Update a payroll record (HR only)"""
    if current_user["role"] not in ["hr", "admin"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    try:
        existing = db.payroll.find_one({"_id": ObjectId(payroll_id)})
        if not existing:
            raise HTTPException(status_code=404, detail="Payroll record not found")
        
        update_data = {}
        
        if request.bonus is not None:
            update_data["bonus"] = request.bonus
            # Recalculate net salary with bonus
            update_data["netSalary"] = existing.get("netSalary", 0) - existing.get("bonus", 0) + request.bonus
        
        if request.deductions is not None:
            # Add additional deductions
            current_deductions = existing.get("deductions", {})
            current_deductions["additional"] = request.deductions
            current_deductions["total"] = current_deductions.get("standard", 0) + current_deductions.get("absentDeduction", 0) + current_deductions.get("halfDayDeduction", 0) + request.deductions
            update_data["deductions"] = current_deductions
            
            # Recalculate net salary
            gross = existing.get("grossSalary", 0)
            update_data["netSalary"] = gross - current_deductions["total"] + existing.get("bonus", 0)
        
        if request.status is not None:
            update_data["status"] = request.status
            if request.status == "paid":
                update_data["paidAt"] = datetime.utcnow()
                update_data["paidBy"] = current_user["employeeId"]
        
        if request.remarks is not None:
            update_data["remarks"] = request.remarks
        
        if not update_data:
            raise HTTPException(status_code=400, detail="No fields to update")
        
        update_data["updatedAt"] = datetime.utcnow()
        update_data["updatedBy"] = current_user["employeeId"]
        
        db.payroll.update_one(
            {"_id": ObjectId(payroll_id)},
            {"$set": update_data}
        )
        
        return {"success": True, "message": "Payroll updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Update payroll error: {e}")
        raise HTTPException(status_code=500, detail="Failed to update payroll")

@app.delete("/api/payroll/{payroll_id}")
def delete_payroll(payroll_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a payroll record (HR only)"""
    if current_user["role"] not in ["hr", "admin"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    try:
        result = db.payroll.delete_one({"_id": ObjectId(payroll_id)})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Payroll record not found")
        
        return {"success": True, "message": "Payroll record deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Delete payroll error: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete payroll")

@app.get("/api/payroll/summary")
def get_payroll_summary(month: Optional[int] = None, year: Optional[int] = None, current_user: dict = Depends(get_current_user)):
    """Get payroll summary for a month (HR only)"""
    if current_user["role"] not in ["hr", "admin"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    try:
        now = datetime.now()
        target_month = month or now.month
        target_year = year or now.year
        
        payroll_records = list(db.payroll.find({
            "month": target_month,
            "year": target_year
        }))
        
        total_gross = sum([r.get("grossSalary", 0) for r in payroll_records])
        total_deductions = sum([r.get("deductions", {}).get("total", 0) for r in payroll_records])
        total_bonus = sum([r.get("bonus", 0) for r in payroll_records])
        total_net = sum([r.get("netSalary", 0) for r in payroll_records])
        
        paid_count = len([r for r in payroll_records if r.get("status") == "paid"])
        pending_count = len([r for r in payroll_records if r.get("status") != "paid"])
        
        return {
            "success": True,
            "data": {
                "month": target_month,
                "year": target_year,
                "totalEmployees": len(payroll_records),
                "paidCount": paid_count,
                "pendingCount": pending_count,
                "totalGrossSalary": round(total_gross, 2),
                "totalDeductions": round(total_deductions, 2),
                "totalBonus": round(total_bonus, 2),
                "totalNetSalary": round(total_net, 2)
            }
        }
    except Exception as e:
        print(f"Get payroll summary error: {e}")
        raise HTTPException(status_code=500, detail="Failed to get payroll summary")

# ==================== LEAVE TYPES MANAGEMENT ====================

@app.get("/api/leave-types")
def get_leave_types(current_user: dict = Depends(get_current_user)):
    """Get all leave types - available to all authenticated users"""
    try:
        query = {}
        # Employees only see active leave types
        if current_user["role"] == "employee":
            query["isActive"] = True
        
        leave_types = []
        for lt in db.leavetypes.find(query).sort("name", 1):
            lt["_id"] = str(lt["_id"])
            leave_types.append(lt)
        
        return {"success": True, "data": leave_types}
    except Exception as e:
        print(f"Get leave types error: {e}")
        raise HTTPException(status_code=500, detail="Failed to get leave types")

@app.get("/api/leave-types/{leave_type_id}")
def get_leave_type(leave_type_id: str, current_user: dict = Depends(get_current_user)):
    """Get a specific leave type"""
    try:
        leave_type = db.leavetypes.find_one({"_id": ObjectId(leave_type_id)})
        if not leave_type:
            raise HTTPException(status_code=404, detail="Leave type not found")
        
        leave_type["_id"] = str(leave_type["_id"])
        return {"success": True, "data": leave_type}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Get leave type error: {e}")
        raise HTTPException(status_code=500, detail="Failed to get leave type")

@app.post("/api/leave-types")
def create_leave_type(request: CreateLeaveTypeRequest, current_user: dict = Depends(get_current_user)):
    """Create a new leave type (HR only)"""
    if current_user["role"] not in ["hr", "admin"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    try:
        # Check if code already exists
        existing = db.leavetypes.find_one({"code": request.code.upper()})
        if existing:
            raise HTTPException(status_code=400, detail=f"Leave type with code '{request.code}' already exists")
        
        # Check if name already exists
        existing_name = db.leavetypes.find_one({"name": {"$regex": f"^{request.name}$", "$options": "i"}})
        if existing_name:
            raise HTTPException(status_code=400, detail=f"Leave type with name '{request.name}' already exists")
        
        leave_type_data = {
            "name": request.name,
            "code": request.code.upper(),
            "totalDays": request.totalDays,
            "description": request.description or "",
            "carryForward": request.carryForward,
            "maxCarryForward": request.maxCarryForward if request.carryForward else 0,
            "isPaid": request.isPaid,
            "isActive": request.isActive,
            "createdBy": current_user["employeeId"],
            "createdAt": datetime.utcnow()
        }
        
        result = db.leavetypes.insert_one(leave_type_data)
        leave_type_data["_id"] = str(result.inserted_id)
        
        return {
            "success": True,
            "message": f"Leave type '{request.name}' created successfully",
            "data": leave_type_data
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Create leave type error: {e}")
        raise HTTPException(status_code=500, detail="Failed to create leave type")

@app.put("/api/leave-types/{leave_type_id}")
def update_leave_type(leave_type_id: str, request: UpdateLeaveTypeRequest, current_user: dict = Depends(get_current_user)):
    """Update a leave type (HR only)"""
    if current_user["role"] not in ["hr", "admin"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    try:
        existing = db.leavetypes.find_one({"_id": ObjectId(leave_type_id)})
        if not existing:
            raise HTTPException(status_code=404, detail="Leave type not found")
        
        update_data = {}
        
        if request.name is not None:
            # Check if name already exists (excluding current)
            existing_name = db.leavetypes.find_one({
                "name": {"$regex": f"^{request.name}$", "$options": "i"},
                "_id": {"$ne": ObjectId(leave_type_id)}
            })
            if existing_name:
                raise HTTPException(status_code=400, detail=f"Leave type with name '{request.name}' already exists")
            update_data["name"] = request.name
        
        if request.totalDays is not None:
            if request.totalDays < 0:
                raise HTTPException(status_code=400, detail="Total days cannot be negative")
            update_data["totalDays"] = request.totalDays
        
        if request.description is not None:
            update_data["description"] = request.description
        
        if request.carryForward is not None:
            update_data["carryForward"] = request.carryForward
            if not request.carryForward:
                update_data["maxCarryForward"] = 0
        
        if request.maxCarryForward is not None:
            update_data["maxCarryForward"] = request.maxCarryForward
        
        if request.isPaid is not None:
            update_data["isPaid"] = request.isPaid
        
        if request.isActive is not None:
            update_data["isActive"] = request.isActive
        
        if not update_data:
            raise HTTPException(status_code=400, detail="No fields to update")
        
        update_data["updatedBy"] = current_user["employeeId"]
        update_data["updatedAt"] = datetime.utcnow()
        
        db.leavetypes.update_one(
            {"_id": ObjectId(leave_type_id)},
            {"$set": update_data}
        )
        
        return {"success": True, "message": "Leave type updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Update leave type error: {e}")
        raise HTTPException(status_code=500, detail="Failed to update leave type")

@app.delete("/api/leave-types/{leave_type_id}")
def delete_leave_type(leave_type_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a leave type (HR only)"""
    if current_user["role"] not in ["hr", "admin"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    try:
        # Check if leave type is being used in any leave requests
        leave_type = db.leavetypes.find_one({"_id": ObjectId(leave_type_id)})
        if not leave_type:
            raise HTTPException(status_code=404, detail="Leave type not found")
        
        # Check if any leave requests use this type
        used_in_requests = db.leaverequests.find_one({"leaveType": leave_type["name"]})
        if used_in_requests:
            raise HTTPException(
                status_code=400, 
                detail=f"Cannot delete '{leave_type['name']}' as it is used in existing leave requests. Consider deactivating it instead."
            )
        
        result = db.leavetypes.delete_one({"_id": ObjectId(leave_type_id)})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Leave type not found")
        
        return {"success": True, "message": f"Leave type '{leave_type['name']}' deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Delete leave type error: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete leave type")

@app.post("/api/leave-types/seed")
def seed_leave_types(current_user: dict = Depends(get_current_user)):
    """Seed default leave types (HR only)"""
    if current_user["role"] not in ["hr", "admin"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    try:
        default_leave_types = [
            {
                "name": "Casual Leave",
                "code": "CL",
                "totalDays": 12,
                "description": "For personal matters and short-term absences",
                "carryForward": False,
                "maxCarryForward": 0,
                "isPaid": True,
                "isActive": True
            },
            {
                "name": "Sick Leave",
                "code": "SL",
                "totalDays": 10,
                "description": "For illness and medical appointments",
                "carryForward": False,
                "maxCarryForward": 0,
                "isPaid": True,
                "isActive": True
            },
            {
                "name": "Annual Leave",
                "code": "AL",
                "totalDays": 15,
                "description": "Earned/privilege leave for vacation",
                "carryForward": True,
                "maxCarryForward": 5,
                "isPaid": True,
                "isActive": True
            },
            {
                "name": "Maternity Leave",
                "code": "ML",
                "totalDays": 180,
                "description": "For expecting mothers (6 months)",
                "carryForward": False,
                "maxCarryForward": 0,
                "isPaid": True,
                "isActive": True
            },
            {
                "name": "Paternity Leave",
                "code": "PL",
                "totalDays": 15,
                "description": "For new fathers",
                "carryForward": False,
                "maxCarryForward": 0,
                "isPaid": True,
                "isActive": True
            },
            {
                "name": "Unpaid Leave",
                "code": "UL",
                "totalDays": 30,
                "description": "Leave without pay",
                "carryForward": False,
                "maxCarryForward": 0,
                "isPaid": False,
                "isActive": True
            },
            {
                "name": "Bereavement Leave",
                "code": "BL",
                "totalDays": 5,
                "description": "For loss of immediate family member",
                "carryForward": False,
                "maxCarryForward": 0,
                "isPaid": True,
                "isActive": True
            },
            {
                "name": "Work From Home",
                "code": "WFH",
                "totalDays": 52,
                "description": "Remote work days",
                "carryForward": False,
                "maxCarryForward": 0,
                "isPaid": True,
                "isActive": True
            }
        ]
        
        created_count = 0
        skipped_count = 0
        
        for lt in default_leave_types:
            existing = db.leavetypes.find_one({"code": lt["code"]})
            if existing:
                skipped_count += 1
                continue
            
            lt["createdBy"] = current_user["employeeId"]
            lt["createdAt"] = datetime.utcnow()
            db.leavetypes.insert_one(lt)
            created_count += 1
        
        return {
            "success": True,
            "message": f"Seeded {created_count} leave types, skipped {skipped_count} existing",
            "created": created_count,
            "skipped": skipped_count
        }
    except Exception as e:
        print(f"Seed leave types error: {e}")
        raise HTTPException(status_code=500, detail="Failed to seed leave types")

@app.get("/api/leave-balance/{employee_id}")
def get_leave_balance(employee_id: str, year: Optional[int] = None, current_user: dict = Depends(get_current_user)):
    """Get leave balance for an employee"""
    try:
        # Employees can only view their own balance
        if current_user["role"] == "employee" and current_user["employeeId"] != employee_id:
            raise HTTPException(status_code=403, detail="You can only view your own leave balance")
        
        target_year = year or datetime.now().year
        
        # Get employee
        employee = db.employees.find_one({"employeeId": employee_id})
        if not employee:
            raise HTTPException(status_code=404, detail="Employee not found")
        
        # Get all active leave types
        leave_types = list(db.leavetypes.find({"isActive": True}))
        
        # Get approved leave requests for the year
        year_start = f"{target_year}-01-01"
        year_end = f"{target_year}-12-31"
        
        leave_requests = list(db.leaverequests.find({
            "employeeId": employee_id,
            "status": "approved",
            "startDate": {"$gte": year_start, "$lte": year_end}
        }))
        
        # Calculate balance for each leave type
        balance = []
        for lt in leave_types:
            # Count used days for this leave type
            used_days = sum([
                lr.get("days", 0) 
                for lr in leave_requests 
                if lr.get("leaveType") == lt["name"]
            ])
            
            # Get pending requests
            pending_requests = list(db.leaverequests.find({
                "employeeId": employee_id,
                "leaveType": lt["name"],
                "status": "pending",
                "startDate": {"$gte": year_start, "$lte": year_end}
            }))
            pending_days = sum([pr.get("days", 0) for pr in pending_requests])
            
            available = lt["totalDays"] - used_days
            
            balance.append({
                "leaveType": lt["name"],
                "code": lt["code"],
                "totalDays": lt["totalDays"],
                "usedDays": used_days,
                "pendingDays": pending_days,
                "availableDays": max(0, available),
                "isPaid": lt.get("isPaid", True)
            })
        
        return {
            "success": True,
            "data": {
                "employee": {
                    "employeeId": employee_id,
                    "name": f"{employee.get('firstName', '')} {employee.get('lastName', '')}"
                },
                "year": target_year,
                "balance": balance
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Get leave balance error: {e}")
        raise HTTPException(status_code=500, detail="Failed to get leave balance")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5002)