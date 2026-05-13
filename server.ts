import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import mysql from "mysql2/promise";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import { Resend } from 'resend';

dotenv.config({ override: true });

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-super-secure';
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY.trim()) : null;

if (!resend) {
  console.warn("⚠️ [AUTH] RESEND_API_KEY is not defined. Email OTPs will not be delivered. Check your environment variables.");
} else {
  console.log("✅ [AUTH] Resend Email Provider initialized.");
}

export const verifyToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.status(401).json({ error: 'Access denied' });

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err || !user) return res.status(403).json({ error: 'Invalid token' });
    if (user?.role === 'collector') {
      user.role = 'fo';
    }
    req.user = user;
    next();
  });
};

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '50mb' }));

  // Unified OTP Sender
  const sendOTP = async (identifier: string, otp: string, userEmail?: string | null) => {
    let targetEmail = (userEmail || (identifier.includes('@') ? identifier : null))?.trim();
    
    if (resend && targetEmail && targetEmail.includes('@')) {
      try {
        const cleanEmail = targetEmail.trim().toLowerCase();
        console.log(`[OTP] Sending OTP to: ${cleanEmail}`);

        // Using exactly the format that worked in our manual test
        const result = await resend.emails.send({
          from: 'onboarding@resend.dev',
          to: cleanEmail,
          subject: 'Login OTP: ' + otp,
          text: `Your security code is: ${otp}`,
          html: `<strong>Code: ${otp}</strong>`
        });
        
        if (result.error) {
          console.error('[RESEND FAIL]', JSON.stringify(result.error));
        } else {
          console.log('[RESEND OK]', result.data?.id);
          return { success: true, email: cleanEmail };
        }
      } catch (err: any) {
        console.error('[RESEND ERROR]', err?.message || err);
      }
    } else {
      console.warn(`[OTP SKIP] Invalid endpoint for ${identifier}: "${targetEmail}"`);
    }
    
    console.log(`[OTP DEBUG] Fallback for ${identifier}: ${otp}`);
    return { success: false, email: targetEmail };
  };

  // Database Connection
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'aljooya_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000, 
    connectTimeout: 30000,
    maxIdle: 0, 
    idleTimeout: 30000,
  });

  // Centralized query retry helper
  async function queryWithRetry(sql: string, params: any[] = [], retries = 5) {
    let lastError: any;
    for (let i = 0; i < retries; i++) {
      try {
        const [rows] = await pool.query(sql, params);
        return rows;
      } catch (err: any) {
        lastError = err;
        if (err.code === 'ECONNRESET' || err.code === 'PROTOCOL_CONNECTION_LOST' || err.code === 'ETIMEDOUT') {
          // Only log on the last few retries or if it's a persistent issue
          if (i >= 2) {
            console.warn(`Database connection recovery (${err.code}). Retry ${i + 1}/${retries}...`);
          }
          if (i < retries - 1) {
            await new Promise(resolve => setTimeout(resolve, 200 * (i + 1))); 
            continue;
          }
        }
        throw err;
      }
    }
    throw lastError;
  }

  // Handle pool errors
  pool.on('connection', (connection: any) => {
    connection.on('error', (err: any) => {
      // Avoid loud logging for common reset errors that are handled by retry logic
      if (err.code === 'ECONNRESET' || err.code === 'PROTOCOL_CONNECTION_LOST') {
        return; 
      }
      console.error('Unexpected Database Connection Error:', err);
    });
  });

  // Initialize Tables - Disabled to use existing production tables
  try {
    const conn = await pool.getConnection();
    console.log("Database connected successfully to Hostinger MySQL");

    // Phase 1: Basic infrastructure tables
    try {
      await conn.query(`
        CREATE TABLE IF NOT EXISTS branches (
          id INT AUTO_INCREMENT PRIMARY KEY,
          company_id INT DEFAULT 1,
          branch_name VARCHAR(100) NOT NULL,
          branch_code VARCHAR(50) NOT NULL UNIQUE,
          area VARCHAR(100),
          district VARCHAR(100),
          state VARCHAR(100),
          address TEXT,
          phone VARCHAR(20),
          email VARCHAR(100),
          manager_name VARCHAR(100),
          manager_phone VARCHAR(20),
          opening_date DATE,
          status ENUM('active', 'inactive') DEFAULT 'active',
          pincode VARCHAR(10),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log("branches table ensured");
    } catch (e: any) { console.error("branches table creation failed:", e); }

    try {
      await conn.query(`
        CREATE TABLE IF NOT EXISTS users (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          phone VARCHAR(20) NOT NULL UNIQUE,
          email VARCHAR(100),
          password VARCHAR(255) NOT NULL,
          role VARCHAR(50) DEFAULT 'fo',
          branch_id INT,
          status ENUM('active', 'inactive') DEFAULT 'active',
          address TEXT,
          photo_url LONGTEXT,
          join_date DATE,
          salary VARCHAR(50),
          emergency_contact VARCHAR(20),
          date_of_birth DATE,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL
        )
      `);
      console.log("users table ensured");
    } catch (e: any) { console.error("users table creation failed:", e); }

    try {
      await conn.query(`
        CREATE TABLE IF NOT EXISTS groups (
          id INT AUTO_INCREMENT PRIMARY KEY,
          group_name VARCHAR(255) NOT NULL,
          group_code VARCHAR(100) NOT NULL UNIQUE,
          branch_id INT,
          collector_id INT,
          meeting_day VARCHAR(20),
          description TEXT,
          status VARCHAR(50) DEFAULT 'active',
          center_name VARCHAR(255),
          center_code VARCHAR(100),
          village VARCHAR(255),
          meeting_location VARCHAR(255),
          formation_date DATE,
          meeting_time TIME,
          collection_type VARCHAR(50) DEFAULT 'Weekly',
          created_by INT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL,
          FOREIGN KEY (collector_id) REFERENCES users(id) ON DELETE SET NULL
        )
      `);
      console.log("groups table ensured");
    } catch (e: any) { console.error("groups table creation failed:", e); }

    try {
      await conn.query(`
        CREATE TABLE IF NOT EXISTS members (
          id INT AUTO_INCREMENT PRIMARY KEY,
          member_code VARCHAR(100) NOT NULL UNIQUE,
          full_name VARCHAR(255) NOT NULL,
          aadhar_no VARCHAR(20),
          guardian_name VARCHAR(255),
          guardian_type VARCHAR(50),
          marital_status VARCHAR(50),
          gender VARCHAR(20),
          dob DATE,
          age INT,
          religion VARCHAR(50),
          category VARCHAR(50),
          education VARCHAR(100),
          occupation VARCHAR(100),
          monthly_income DECIMAL(15, 2),
          family_members INT,
          earning_members INT,
          house_type VARCHAR(100),
          residence_years INT,
          mobile_no VARCHAR(20),
          alt_mobile_no VARCHAR(20),
          pin_code VARCHAR(10),
          state VARCHAR(100),
          district VARCHAR(100),
          post_office VARCHAR(100),
          police_station VARCHAR(100),
          village VARCHAR(255),
          voter_id VARCHAR(50),
          pan_no VARCHAR(20),
          group_id INT,
          branch_id INT,
          mem_bank_ifsc VARCHAR(50),
          mem_bank_name VARCHAR(100),
          mem_bank_ac VARCHAR(100),
          nominee_name VARCHAR(100),
          nominee_relation VARCHAR(100),
          nominee_aadhar VARCHAR(20),
          nominee_dob DATE,
          nominee_age INT,
          profile_image LONGTEXT,
          house_image LONGTEXT,
          aadhar_f_image LONGTEXT,
          aadhar_b_image LONGTEXT,
          voter_f_image LONGTEXT,
          voter_b_image LONGTEXT,
          signature LONGTEXT,
          status VARCHAR(50) DEFAULT 'Active',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE SET NULL,
          FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL
        )
      `);
      console.log("members table ensured");
    } catch (e: any) { console.error("members table creation failed:", e); }

    try {
      await conn.query(`
        CREATE TABLE IF NOT EXISTS schemes (
          id INT AUTO_INCREMENT PRIMARY KEY,
          scheme_name VARCHAR(255) NOT NULL,
          scheme_code VARCHAR(100) NOT NULL UNIQUE,
          interest_rate DECIMAL(5, 2) NOT NULL,
          duration_months INT NOT NULL,
          description TEXT,
          repayment_frequency VARCHAR(50) DEFAULT 'Weekly',
          interest_type VARCHAR(50),
          processing_fee DECIMAL(15, 2),
          processing_fee_type VARCHAR(20),
          insurance_fee DECIMAL(15, 2),
          insurance_fee_type VARCHAR(20),
          penalty_rate DECIMAL(5, 2),
          status ENUM('active', 'inactive') DEFAULT 'active',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log("schemes table ensured");
    } catch (e: any) { console.error("schemes table creation failed:", e); }

    try {
      await conn.query(`
        CREATE TABLE IF NOT EXISTS loans (
          id INT AUTO_INCREMENT PRIMARY KEY,
          loan_no VARCHAR(100) UNIQUE,
          customer_id INT NOT NULL,
          scheme_id INT NOT NULL,
          amount DECIMAL(15, 2) NOT NULL,
          duration_weeks INT NOT NULL,
          interest DECIMAL(15, 2) NOT NULL,
          installment DECIMAL(15, 2) NOT NULL,
          start_date DATE NOT NULL,
          status ENUM('pending', 'approved', 'active', 'closed', 'rejected') DEFAULT 'pending',
          branch_id INT,
          total_repayment DECIMAL(15, 2) NOT NULL,
          processing_fee DECIMAL(15, 2) DEFAULT 0.00,
          insurance_fee DECIMAL(15, 2) DEFAULT 0.00,
          emi_frequency VARCHAR(50) DEFAULT 'weekly',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (customer_id) REFERENCES members(id) ON DELETE CASCADE,
          FOREIGN KEY (scheme_id) REFERENCES schemes(id),
          FOREIGN KEY (branch_id) REFERENCES branches(id)
        )
      `);
      console.log("loans table ensured");
    } catch (e: any) { console.error("loans table creation failed:", e); }

    try {
      await conn.query(`
        CREATE TABLE IF NOT EXISTS collections (
          id INT AUTO_INCREMENT PRIMARY KEY,
          loan_id INT NOT NULL,
          amount_paid DECIMAL(15, 2) NOT NULL,
          payment_date DATE NOT NULL,
          collected_by INT,
          branch_id INT,
          is_pre_close BOOLEAN DEFAULT FALSE,
          status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
          approved_by INT,
          approved_at TIMESTAMP NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (loan_id) REFERENCES loans(id) ON DELETE CASCADE,
          FOREIGN KEY (collected_by) REFERENCES users(id),
          FOREIGN KEY (branch_id) REFERENCES branches(id)
        )
      `);
      console.log("collections table ensured");
    } catch (e: any) { console.error("collections table creation failed:", e); }

    // Phase 2: Seed default seed data if empty
    try {
      const [bCount]: any = await conn.query("SELECT COUNT(*) as count FROM branches");
      if (bCount[0].count === 0) {
        await conn.query(`
          INSERT INTO branches (branch_name, branch_code, area, status)
          VALUES ('Head Office', 'BR-0001', 'Hooghly', 'active')
        `);
        console.log("Default branch created");
      }

      const [uCount]: any = await conn.query("SELECT COUNT(*) as count FROM users");
      if (uCount[0].count === 0) {
        const [blist]: any = await conn.query("SELECT id FROM branches LIMIT 1");
        const bid = blist[0]?.id || null;
        await conn.query(`
          INSERT INTO users (name, phone, email, password, role, status, branch_id)
          VALUES ('Salamat Sekh', '9883672737', 'salamatsekh893@gmail.com', '123456', 'superadmin', 'active', ?)
        `, [bid]);
        console.log("Default admin user created");
      }
    } catch (e: any) { console.error("Failed to seed basic data:", e); }
    try {
      await conn.query(`
        CREATE TABLE IF NOT EXISTS otps (
          id INT AUTO_INCREMENT PRIMARY KEY,
          identifier VARCHAR(100) NOT NULL,
          otp VARCHAR(6) NOT NULL,
          expires_at DATETIME NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log("OTPs table initialized");
    } catch(e) {}

    try {
      await conn.query("ALTER TABLE users ADD COLUMN date_of_birth DATE");
      console.log("Added date_of_birth column");
    } catch (e: any) {}
    
    try {
      await conn.query("ALTER TABLE users MODIFY COLUMN role VARCHAR(50) DEFAULT 'fo'");
      console.log("Modified users role column type to VARCHAR");
    } catch (e: any) {
      // Ignore
    }

    try {
      await conn.query("UPDATE users SET role = 'fo' WHERE role = 'collector'");
      await conn.query("UPDATE role_permissions SET role = 'fo' WHERE role = 'collector'");
      console.log("Migrated collector roles to fo");
    } catch (e: any) {
      console.error("Migration error:", e);
    }

    try {
      await conn.query("ALTER TABLE collections ADD COLUMN status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending'");
      console.log("Added status column to collections");
    } catch (e: any) {
      // Ignored
    }

    try {
      await conn.query("ALTER TABLE collections ADD COLUMN is_pre_close BOOLEAN DEFAULT FALSE");
      console.log("Added is_pre_close column to collections");
    } catch (e: any) {
      // Ignored
    }

    try {
      await conn.query("ALTER TABLE collections ADD COLUMN approved_by INT NULL");
      await conn.query("ALTER TABLE collections ADD COLUMN approved_at TIMESTAMP NULL");
      console.log("Added approved_by and approved_at columns to collections");
    } catch (e: any) {
      // Ignored
    }

    
    try {
      await conn.query(`
        CREATE TABLE IF NOT EXISTS companies (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          legal_name VARCHAR(255),
          registration_no VARCHAR(100),
          address TEXT,
          contact_no VARCHAR(20),
          email VARCHAR(100),
          logo_url LONGTEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log("companies table ensured");
      
      // Ensure logo_url is LONGTEXT if it already exists as VARCHAR
      try {
        await conn.query("ALTER TABLE companies MODIFY COLUMN logo_url LONGTEXT");
      } catch (e) {}

      // Ensure photo_url is LONGTEXT for base64 images
      try {
        await conn.query("ALTER TABLE users MODIFY COLUMN photo_url LONGTEXT");
      } catch (e) {}
    } catch (e: any) {
      console.error("companies table creation failed:", e);
    }
    
    try {
      await conn.query(`
        CREATE TABLE IF NOT EXISTS attendance (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          date DATE NOT NULL,
          status VARCHAR(50),
          in_time TIME,
          out_time TIME,
          notes TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE KEY (user_id, date)
        )
      `);
      console.log("attendance table ensured");
    } catch(e: any) {
      console.error(e);
    }
    
    try {
      await conn.query(`
        CREATE TABLE IF NOT EXISTS leaves (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          start_date DATE NOT NULL,
          end_date DATE NOT NULL,
          leave_type VARCHAR(50) NOT NULL DEFAULT 'Other',
          reason TEXT,
          status VARCHAR(20) DEFAULT 'pending',
          applied_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);
      console.log("leaves table ensured");
    } catch(e: any) {
      console.error(e);
    }
    try { await conn.query("ALTER TABLE leaves ADD COLUMN leave_type VARCHAR(50) NOT NULL DEFAULT 'Other'"); } catch(e: any) {}
    try { await conn.query("ALTER TABLE attendance ADD COLUMN in_time TIME"); } catch(e: any) {}
    try { await conn.query("ALTER TABLE attendance ADD COLUMN out_time TIME"); } catch(e: any) {}
    try { await conn.query("ALTER TABLE attendance ADD COLUMN branch_id INT"); } catch(e: any) {}
    
    try {
      await conn.query(`
        CREATE TABLE IF NOT EXISTS holidays (
          id INT AUTO_INCREMENT PRIMARY KEY,
          date DATE NOT NULL UNIQUE,
          reason VARCHAR(255) NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log("holidays table ensured");
    } catch(e: any) {
      console.error(e);
    }
    
    try {
      await conn.query(`
        CREATE TABLE IF NOT EXISTS travel_vehicle_types (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          rate_per_km DECIMAL(10, 2) NOT NULL,
          is_active BOOLEAN DEFAULT TRUE
        )
      `);
      
      const [vRows]: any = await conn.query("SELECT COUNT(*) as count FROM travel_vehicle_types");
      if (vRows[0].count === 0) {
        await conn.query(`
          INSERT INTO travel_vehicle_types (name, rate_per_km) VALUES 
          ('Bike', 3.50),
          ('Car', 8.00),
          ('Bus/Public', 1.00),
          ('Others', 2.00)
        `);
      }
      console.log("travel_vehicle_types table ensured");
    } catch(e) { console.error(e); }

    try {
      await conn.query(`
        CREATE TABLE IF NOT EXISTS travel_logs (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          branch_id INT,
          date DATE NOT NULL,
          source VARCHAR(255) NOT NULL,
          destination VARCHAR(255) NOT NULL,
          distance_km DECIMAL(10, 2) NOT NULL,
          purpose TEXT,
          vehicle_type_id INT,
          amount DECIMAL(15, 2) DEFAULT 0.00,
          rate_per_km_used DECIMAL(10, 2) DEFAULT 0.00,
          image_url LONGTEXT,
          status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
          approved_by INT,
          approved_at TIMESTAMP NULL,
          remarks TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);
      console.log("travel_logs table ensured");
    } catch(e) { console.error(e); }
    
    try { await conn.query("ALTER TABLE travel_logs ADD COLUMN branch_id INT"); } catch(e) {}
    try { await conn.query("ALTER TABLE travel_logs ADD COLUMN rate_per_km_used DECIMAL(10, 2) DEFAULT 0.00"); } catch(e) {}
    try { await conn.query("ALTER TABLE travel_logs ADD COLUMN image_url LONGTEXT"); } catch(e) {}
    
    try {
      await conn.query(`
        CREATE TABLE IF NOT EXISTS global_settings (
          setting_key VARCHAR(100) PRIMARY KEY,
          setting_value TEXT,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);
      // Initialize fuel_rate if not exists
      await conn.query(`INSERT IGNORE INTO global_settings (setting_key, setting_value) VALUES ('fuel_rate', '12')`);
      console.log("global_settings table ensured");
      
      try { await conn.query("ALTER TABLE travel_shifts ADD COLUMN start_lat DECIMAL(10, 8)"); } catch(e) {}
      try { await conn.query("ALTER TABLE travel_shifts ADD COLUMN start_lng DECIMAL(11, 8)"); } catch(e) {}
      try { await conn.query("ALTER TABLE travel_shifts ADD COLUMN end_lat DECIMAL(10, 8)"); } catch(e) {}
      try { await conn.query("ALTER TABLE travel_shifts ADD COLUMN end_lng DECIMAL(11, 8)"); } catch(e) {}
      try { await conn.query("ALTER TABLE travel_shifts ADD COLUMN gps_km DECIMAL(15, 2) DEFAULT 0.00"); } catch(e) {}
    } catch(e) { console.error(e); }

    try {
      await conn.query(`
        CREATE TABLE IF NOT EXISTS travel_shifts (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          branch_id INT,
          date DATE NOT NULL,
          start_time TIMESTAMP NULL,
          end_time TIMESTAMP NULL,
          start_odometer DECIMAL(15, 2),
          end_odometer DECIMAL(15, 2),
          start_lat DECIMAL(10, 8),
          start_lng DECIMAL(11, 8),
          end_lat DECIMAL(10, 8),
          end_lng DECIMAL(11, 8),
          gps_km DECIMAL(15, 2) DEFAULT 0.00,
          start_image LONGTEXT,
          end_image LONGTEXT,
          total_km DECIMAL(10, 2) DEFAULT 0.00,
          status ENUM('active', 'completed', 'approved', 'rejected') DEFAULT 'active',
          amount DECIMAL(15, 2) DEFAULT 0.00,
          rate_per_km DECIMAL(10, 2) DEFAULT 0.00,
          remarks TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);
      console.log("travel_shifts table ensured");
    } catch(e) { console.error(e); }

    try {
      await conn.query(`
        CREATE TABLE IF NOT EXISTS travel_sessions_v2 (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          branch_id INT,
          travel_date DATE NOT NULL,
          start_meter DECIMAL(15, 2) NOT NULL,
          end_meter DECIMAL(15, 2),
          total_km DECIMAL(15, 2) DEFAULT 0,
          rate_per_km DECIMAL(10, 2) DEFAULT 0,
          total_amount DECIMAL(15, 2) DEFAULT 0,
          start_meter_image LONGTEXT NOT NULL,
          end_meter_image LONGTEXT,
          start_lat DECIMAL(10, 8),
          start_lng DECIMAL(11, 8),
          end_lat DECIMAL(10, 8),
          end_lng DECIMAL(11, 8),
          gps_status VARCHAR(50),
          status ENUM('draft', 'submitted', 'pending', 'approved', 'rejected') DEFAULT 'draft',
          admin_remarks TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);
      console.log("travel_sessions_v2 table ensured");
    } catch(e) { console.error(e); }

    try {
      await conn.query(`
        CREATE TABLE IF NOT EXISTS travel_entries_v2 (
          id INT AUTO_INCREMENT PRIMARY KEY,
          session_id INT NOT NULL,
          from_location VARCHAR(255) NOT NULL,
          to_location VARCHAR(255) NOT NULL,
          purpose VARCHAR(255),
          estimated_km DECIMAL(15, 2),
          manual_km DECIMAL(15, 2),
          start_time TIMESTAMP NULL,
          end_time TIMESTAMP NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (session_id) REFERENCES travel_sessions_v2(id) ON DELETE CASCADE
        )
      `);
      console.log("travel_entries_v2 table ensured");
    } catch(e) { console.error(e); }

    try {
      await conn.query(`
        CREATE TABLE IF NOT EXISTS fuel_rate_settings (
          id INT AUTO_INCREMENT PRIMARY KEY,
          vehicle_type VARCHAR(50),
          rate_per_km DECIMAL(10, 2) NOT NULL,
          branch_id INT,
          effective_from DATE,
          status VARCHAR(20) DEFAULT 'active'
        )
      `);
      console.log("fuel_rate_settings table ensured");
    } catch(e) { console.error(e); }

    try {
      await conn.query(`
        CREATE TABLE IF NOT EXISTS travel_visits (
          id INT AUTO_INCREMENT PRIMARY KEY,
          shift_id INT NOT NULL,
          location_name VARCHAR(255),
          latitude DECIMAL(10, 8),
          longitude DECIMAL(11, 8),
          time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          purpose TEXT,
          image_url LONGTEXT,
          FOREIGN KEY (shift_id) REFERENCES travel_shifts(id) ON DELETE CASCADE
        )
      `);
      console.log("travel_visits table ensured");
    } catch(e) { console.error(e); }

    try {
      await conn.query(`
        CREATE TABLE IF NOT EXISTS bank_accounts (
          id INT AUTO_INCREMENT PRIMARY KEY,
          bank_name VARCHAR(100) NOT NULL,
          account_number VARCHAR(100) NOT NULL,
          ifsc_code VARCHAR(50) NOT NULL,
          branch_name VARCHAR(100) NOT NULL,
          account_name VARCHAR(100) NOT NULL,
          opening_balance DECIMAL(15, 2) DEFAULT 0.00,
          current_balance DECIMAL(15, 2) DEFAULT 0.00,
          status ENUM('active', 'inactive') DEFAULT 'active',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log("bank_accounts table ensured");
    } catch (e: any) {
      console.error("bank_accounts table creation failed:", e);
    }
    
    try {
      await conn.query(`
        CREATE TABLE IF NOT EXISTS company_capital (
          id INT AUTO_INCREMENT PRIMARY KEY,
          date DATE NOT NULL,
          amount DECIMAL(15, 2) NOT NULL,
          payment_method VARCHAR(50) NOT NULL,
          bank_id INT,
          source_type VARCHAR(50) DEFAULT 'self',
          source_name VARCHAR(100),
          remarks TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      try { await conn.query(`ALTER TABLE company_capital ADD COLUMN source_type VARCHAR(50) DEFAULT 'self'`); } catch(e) {}
      try { await conn.query(`ALTER TABLE company_capital ADD COLUMN source_name VARCHAR(100)`); } catch(e) {}
      try { await conn.query(`ALTER TABLE company_capital ADD COLUMN source_mobile VARCHAR(50)`); } catch(e) {}
      try { await conn.query(`ALTER TABLE company_capital ADD COLUMN source_address TEXT`); } catch(e) {}
      try { await conn.query(`ALTER TABLE company_capital ADD COLUMN investor_id INT`); } catch(e) {}
      
      try { await conn.query(`ALTER TABLE groups ADD COLUMN collector_id INT`); } catch(e) {}
      try { await conn.query(`ALTER TABLE groups ADD COLUMN group_code VARCHAR(100)`); } catch(e) {}
      try { await conn.query(`ALTER TABLE groups ADD COLUMN description TEXT`); } catch(e) {}
      try { await conn.query(`ALTER TABLE groups ADD COLUMN status VARCHAR(50) DEFAULT 'active'`); } catch(e) {}
      try { await conn.query(`ALTER TABLE groups ADD COLUMN center_name VARCHAR(255)`); } catch(e) {}
      try { await conn.query(`ALTER TABLE groups ADD COLUMN center_code VARCHAR(100)`); } catch(e) {}
      try { await conn.query(`ALTER TABLE groups ADD COLUMN village VARCHAR(255)`); } catch(e) {}
      try { await conn.query(`ALTER TABLE groups ADD COLUMN meeting_location VARCHAR(255)`); } catch(e) {}
      try { await conn.query(`ALTER TABLE groups ADD COLUMN formation_date DATE`); } catch(e) {}
      try { await conn.query(`ALTER TABLE groups ADD COLUMN meeting_time TIME`); } catch(e) {}
      try { await conn.query(`ALTER TABLE groups ADD COLUMN collection_type VARCHAR(50) DEFAULT 'Weekly'`); } catch(e) {}
      try { await conn.query(`ALTER TABLE groups ADD COLUMN created_by INT`); } catch(e) {}
      try { await conn.query(`ALTER TABLE groups ADD COLUMN max_members INT DEFAULT 10`); } catch(e) {}
      try { await conn.query(`ALTER TABLE groups ADD COLUMN min_members INT DEFAULT 5`); } catch(e) {}

      try {
        await conn.query(`
          CREATE TABLE IF NOT EXISTS group_leaders (
            id INT AUTO_INCREMENT PRIMARY KEY,
            group_id INT,
            name VARCHAR(255),
            mobile VARCHAR(20),
            alt_mobile VARCHAR(20),
            address VARCHAR(255),
            occupation VARCHAR(100),
            id_proof VARCHAR(100),
            photo_url TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(group_id) REFERENCES groups(id) ON DELETE CASCADE
          )
        `);
      } catch(e) {}


      
      // Investors table
      try {
        await conn.query(`
          CREATE TABLE IF NOT EXISTS investors (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            mobile VARCHAR(20),
            address TEXT,
            photo LONGTEXT,
            id_proof LONGTEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);
        console.log("investors table ensured");
      } catch (e: any) {
        console.error("investors table creation failed:", e);
      }
      
      // Removed duplicated try catch
      
      // Bank Transactions table
      try {
        await conn.query(`
          CREATE TABLE IF NOT EXISTS bank_transactions (
            id INT AUTO_INCREMENT PRIMARY KEY,
            bank_id INT NOT NULL,
            date DATE NOT NULL,
            type ENUM('deposit', 'withdrawal') NOT NULL,
            source_type ENUM('capital', 'branch', 'other') NOT NULL,
            source_id INT, -- branch_id, capital_id, etc
            amount DECIMAL(15, 2) NOT NULL,
            purpose TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);
        console.log("bank_transactions table ensured");
      } catch (e: any) {
        console.error("bank_transactions table creation failed:", e);
      }
      
      try {
        await conn.query(`
          CREATE TABLE IF NOT EXISTS savings_accounts (
            id INT AUTO_INCREMENT PRIMARY KEY,
            account_no VARCHAR(100) NOT NULL UNIQUE,
            member_id INT NOT NULL,
            account_type ENUM('saving', 'rd') NOT NULL,
            status ENUM('active', 'closed', 'matured') DEFAULT 'active',
            balance DECIMAL(15, 2) DEFAULT 0.00,
            interest_rate DECIMAL(5, 2) DEFAULT 0.00,
            deposit_frequency ENUM('daily', 'weekly', 'biweekly', 'monthly') DEFAULT 'monthly',
            monthly_deposit DECIMAL(15, 2) NULL,
            duration_months INT NULL,
            maturity_amount DECIMAL(15, 2) NULL,
            maturity_date DATE NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
          )
        `);
        console.log("savings_accounts table ensured");
      } catch (e: any) {
        console.error("savings_accounts table creation failed:", e);
      }

      try {
        await conn.query(`
          CREATE TABLE IF NOT EXISTS savings_transactions (
            id INT AUTO_INCREMENT PRIMARY KEY,
            savings_account_id INT NOT NULL,
            date DATE NOT NULL,
            type ENUM('deposit', 'withdrawal', 'interest') NOT NULL,
            amount DECIMAL(15, 2) NOT NULL,
            remarks VARCHAR(255),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (savings_account_id) REFERENCES savings_accounts(id) ON DELETE CASCADE
          )
        `);
        console.log("savings_transactions table ensured");
      } catch (e: any) {
        console.error("savings_transactions table creation failed:", e);
      }

      try {
        await conn.query(`
          CREATE TABLE IF NOT EXISTS role_permissions (
            role VARCHAR(50) PRIMARY KEY,
            permissions TEXT
          )
        `);
        console.log("role_permissions table ensured");
      } catch (e: any) {
        console.error("role_permissions table creation failed:", e);
      }

      try {
        await conn.query(`
          CREATE TABLE IF NOT EXISTS products (
            id INT AUTO_INCREMENT PRIMARY KEY,
            product_name VARCHAR(255) NOT NULL,
            product_code VARCHAR(100),
            price DECIMAL(15, 2) NOT NULL,
            stock_quantity INT NOT NULL DEFAULT 0,
            description TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);
        console.log("products table ensured");
      } catch (e: any) {
        console.error("products table creation failed:", e);
      }

      try {
        await conn.query(`
          CREATE TABLE IF NOT EXISTS sales (
            id INT AUTO_INCREMENT PRIMARY KEY,
            sale_date DATE NOT NULL,
            member_id INT,
            product_id INT NOT NULL,
            quantity INT NOT NULL,
            total_amount DECIMAL(15, 2) NOT NULL,
            payment_method VARCHAR(50),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);
        console.log("sales table ensured");
      } catch (e: any) {
        console.error("sales table creation failed:", e);
      }

      try {
        await conn.query(`ALTER TABLE savings_accounts ADD COLUMN deposit_frequency ENUM('daily', 'weekly', 'biweekly', 'monthly') DEFAULT 'monthly' AFTER interest_rate`);
        console.log("deposit_frequency column added");
      } catch(e: any) {
        if(e.code !== 'ER_DUP_FIELDNAME') {
          console.error("Failed to add deposit_frequency:", e);
        }
      }
      
      console.log("company_capital table ensured");
    } catch (e: any) {
      console.error("company_capital table creation failed:", e);
    }
    
    conn.release();
  } catch (err) {
    console.error("Database connection failed:", err);
  }

  // API Routes
  app.post("/api/auth/login-init", async (req, res) => {
    try {
      const { phone, password } = req.body;

      if (!phone || !password) {
        return res.status(400).json({ error: 'Phone and password are required' });
      }

      // Check database
      let rows: any = [];
      try {
        const result = await pool.query('SELECT * FROM users WHERE phone = ? OR email = ? LIMIT 1', [phone, phone]);
        rows = result[0];
      } catch (dbErr: any) {
        console.error("Login DB Query Error:", dbErr);
        return res.status(503).json({ error: 'DB Error: ' + dbErr.message });
      }
      
      let user: any = null;
      if (rows.length > 0) {
        user = rows[0];
        if (user.password !== password) {
          return res.status(401).json({ error: 'Invalid password' });
        }
      } else if (phone === '9883672737' && password === '123456') {
        user = { 
          id: 1, 
          name: 'Salamat Sekh', 
          role: 'superadmin', 
          branch_id: null,
          phone: '9883672737',
          email: 'admin@aljooya.com',
          photo_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Salamat',
          address: 'Head Office, Aljooya',
          join_date: '2023-01-01'
        };
      } else {
        return res.status(401).json({ error: 'User not found' });
      }

      // Generate Token directly for Password Login
      const payload = { userId: user.id, role: user.role || 'employee', branchId: user.branch_id };
      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });

      res.json({ 
        message: 'Login successful',
        user,
        token
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to login' });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    // Legacy support or fallback logic
    res.status(400).json({ error: 'Please use the multi-step login flow' });
  });

  app.post("/api/auth/verify-password", verifyToken, async (req: any, res) => {
    try {
      const { password } = req.body;
      const userId = req.user.userId;

      // Check hardcoded superadmin
      if (userId === 1 && password === '123456') {
        return res.json({ valid: true });
      }

      const [rows]: any = await pool.query('SELECT password FROM users WHERE id = ?', [userId]);
      if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
      
      const isValid = rows[0].password === password;
      res.json({ valid: isValid });
    } catch (err) {
      res.status(500).json({ error: 'Validation failed' });
    }
  });

  app.post("/api/auth/send-otp", async (req, res) => {
    try {
      const { identifier, type } = req.body; // identifier can be phone or email
      if (!identifier) return res.status(400).json({ error: 'Identifier is required' });

      // Check if user exists
      const [userRows]: any = await pool.query(
        'SELECT * FROM users WHERE phone = ? OR email = ? LIMIT 1', 
        [identifier, identifier]
      );

      if (userRows.length === 0 && identifier !== '9883672737') {
        return res.status(404).json({ error: 'User not found' });
      }

      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      await pool.query(
        'INSERT INTO otps (identifier, otp, expires_at) VALUES (?, ?, ?)',
        [identifier, otp, expiresAt]
      );

      const targetEmail = userRows[0]?.email || (identifier.includes('@') ? identifier : null);
      const otpRes = await sendOTP(identifier, otp, targetEmail);

      res.json({ 
        message: 'OTP sent successfully',
        sentToEmail: otpRes.success ? otpRes.email : null
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to send OTP' });
    }
  });

  app.post("/api/auth/login-otp", async (req, res) => {
    try {
      const { identifier, otp } = req.body;
      
      const [otpRows]: any = await pool.query(
        'SELECT * FROM otps WHERE identifier = ? AND otp = ? AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1',
        [identifier, otp]
      );
      const isValidOtp = otpRows.length > 0;

      if (!isValidOtp) {
        return res.status(400).json({ error: 'Invalid or expired OTP' });
      }

      // Successful OTP verification
      let user: any;
      if (identifier === '9883672737') {
        user = { 
          id: 1, 
          name: 'Salamat Sekh', 
          role: 'superadmin', 
          branchId: 1, 
          phone: '9883672737',
          email: 'admin@aljooya.com',
          photo_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Salamat',
          address: 'Head Office, Aljooya',
          join_date: '2023-01-01'
        };
      } else {
        const [userRows]: any = await pool.query(
          'SELECT * FROM users WHERE phone = ? OR email = ? LIMIT 1', 
          [identifier, identifier]
        );
        if (userRows.length === 0) return res.status(404).json({ error: 'User cleanup issue' });
        user = userRows[0];
      }

      const payload = { userId: user.id, role: user.role || 'employee', branchId: user.branch_id };
      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });

      // Clean up used OTP
      await pool.query('DELETE FROM otps WHERE identifier = ?', [identifier]);

      res.json({
        user: { 
          id: user.id,
          name: user.name, 
          role: user.role, 
          branchId: user.branch_id,
          photo_url: user.photo_url || null,
          phone: user.phone,
          email: user.email,
          join_date: user.join_date,
          address: user.address
        },
        token
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Login failed' });
    }
  });

  app.put("/api/auth/change-password", verifyToken, async (req: any, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = req.user.userId;

      // Verification Logic
      let isAuthorized = false;
      if (userId === 1 && currentPassword === '123456') {
        isAuthorized = true;
      }

      const [rows]: any = await pool.query('SELECT password FROM users WHERE id = ?', [userId]);
      
      if (!isAuthorized) {
        if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
        if (rows[0].password !== currentPassword) {
          return res.status(400).json({ error: 'Current password is incorrect' });
        }
        isAuthorized = true;
      }

      if (isAuthorized) {
        if (rows.length > 0) {
          await pool.query('UPDATE users SET password = ? WHERE id = ?', [newPassword, userId]);
        }
        res.json({ message: 'Password updated successfully' });
      }
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to update password' });
    }
  });

  app.get("/api/me", verifyToken, async (req: any, res) => {
    try {
      const [rows]: any = await pool.query('SELECT * FROM users WHERE id = ? LIMIT 1', [req.user.userId]);
      if (rows.length > 0) {
        const user = rows[0];
        let permissions: string[] | null = null;
        if (user.role && user.role !== 'superadmin') {
           const [permRows]: any = await pool.query('SELECT permissions FROM role_permissions WHERE role = ?', [user.role]);
           if (permRows.length > 0) {
             permissions = JSON.parse(permRows[0].permissions);
           }
        }
        res.json({
          id: user.id,
          name: user.name,
          role: user.role,
          branchId: user.branch_id,
          permissions: permissions,
          photo_url: user.photo_url || null,
          phone: user.phone,
          email: user.email,
          join_date: user.join_date,
          address: user.address
        });
      } else {
        if (req.user?.role === 'superadmin') {
          res.json({ name: 'Aljooya Admin', role: 'superadmin', branchId: 1, id: 1, photo_url: null });
        } else {
          res.status(404).json({ error: 'User not found' });
        }
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/employees", verifyToken, async (req: any, res) => {
    try {
      const { role, branchId, userId } = req.user;
      let query = `
        SELECT u.*, b.branch_name 
        FROM users u 
        LEFT JOIN branches b ON u.branch_id = b.id 
      `;
      const params: any[] = [];
      
      if (role === 'branch_manager') {
        query += ' WHERE u.branch_id = ?';
        params.push(branchId);
      } else if (!['superadmin', 'dm', 'am'].includes(role)) {
        query += ' WHERE u.id = ?';
        params.push(userId);
      }
      
      query += ' ORDER BY u.name ASC';
      const [rows]: any = await pool.query(query, params);
      
      // Inject hardcoded admin if missing so they appear in team directory
      const hasAdmin = rows.find((r: any) => r.phone === '9883672737');
      if (!hasAdmin) {
        rows.unshift({
          id: 0,
          name: 'Aljooya Admin',
          phone: '9883672737',
          role: 'superadmin',
          branch_name: 'Super Admin',
          address: 'Global HQ',
          salary: '-',
          status: 'active'
        });
      }
      
      res.json(rows);
    } catch (err) {
      try {
        const [rows]: any = await pool.query('SELECT * FROM users ORDER BY name ASC');
        const hasAdmin = rows.find((r: any) => r.phone === '9883672737');
        if (!hasAdmin) {
           rows.unshift({ id: 0, name: 'Aljooya Admin', phone: '9883672737', role: 'superadmin' });
        }
        res.json(rows);
      } catch (e) {
        res.status(500).json({ error: 'Database error' });
      }
    }
  });

  app.get("/api/leaves", async (req, res) => {
    try {
      const { user_id, status } = req.query;
      let q = "SELECT l.*, u.name as user_name FROM leaves l JOIN users u ON l.user_id = u.id";
      const params: any[] = [];
      const conditions: string[] = [];
      
      if (user_id) {
        conditions.push("l.user_id = ?");
        params.push(user_id);
      }
      if (status) {
        conditions.push("l.status = ?");
        params.push(status);
      }
      
      if (conditions.length > 0) {
        q += " WHERE " + conditions.join(" AND ");
      }
      q += " ORDER BY l.applied_on DESC";
      
      const [rows] = await pool.query(q, params);
      res.json(rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/leaves", async (req, res) => {
    try {
      const { user_id, start_date, end_date, leave_type, reason } = req.body;
      const [result]: any = await pool.query(
        "INSERT INTO leaves (user_id, start_date, end_date, leave_type, reason, status) VALUES (?, ?, ?, ?, ?, 'pending')",
        [user_id, start_date, end_date, leave_type || 'Other', reason]
      );
      res.json({ id: result.insertId });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/leaves/:id", async (req, res) => {
    try {
      const { status } = req.body; // 'approved' or 'rejected'
      await pool.query("UPDATE leaves SET status = ? WHERE id = ?", [status, req.params.id]);
      
      if (status === 'approved') {
        const [rows]: any = await pool.query("SELECT * FROM leaves WHERE id = ?", [req.params.id]);
        if (rows.length > 0) {
          const leave = rows[0];
          // Determine all dates
          const current = new Date(leave.start_date);
          const end = new Date(leave.end_date);
          current.setHours(0,0,0,0);
          end.setHours(0,0,0,0);
          
          while(current <= end) {
             const dateStr = current.toISOString().split('T')[0];
             // Insert or update attendance for that date as 'leave'
             await pool.query(`
                INSERT INTO attendance (user_id, date, status) 
                VALUES (?, ?, 'leave')
                ON DUPLICATE KEY UPDATE status = 'leave', in_time = NULL, out_time = NULL
             `, [leave.user_id, dateStr]);
             
             current.setDate(current.getDate() + 1);
          }
        }
      }
      
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/attendance", async (req, res) => {
    try {
      const { date } = req.query;
      // Get all employees and their status for the chosen date
      const [rows] = await pool.query(`
        SELECT u.id as user_id, u.name, u.role, u.branch_id, 
               COALESCE(a.status, 'not_marked') as status, a.id,
               a.in_time, a.out_time, a.notes
        FROM users u 
        LEFT JOIN attendance a ON u.id = a.user_id AND a.date = ?
        ORDER BY u.name ASC
      `, [date]);
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: 'Database error' });
    }
  });

  app.get("/api/my-attendance", async (req, res) => {
    try {
      const { start, end, user_id } = req.query;
      if (!user_id) return res.status(400).json({ error: 'user_id required' });
      
      const [rows] = await pool.query(`
        SELECT * FROM attendance 
        WHERE user_id = ? AND date >= ? AND date <= ?
        ORDER BY date ASC
      `, [user_id, start, end]);
      
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: 'Database error' });
    }
  });

  app.post("/api/attendance", async (req, res) => {
    try {
      const { user_id, date, status, in_time, out_time, notes } = req.body;
      const [existing]: any = await pool.query('SELECT id FROM attendance WHERE user_id = ? AND date = ?', [user_id, date]);
      
      if (existing.length > 0) {
        let updateQuery = 'UPDATE attendance SET status = ?, notes = ?';
        const params: any[] = [status, notes || ''];
        
        if (in_time !== undefined) {
          updateQuery += ', in_time = ?';
          params.push(in_time);
        }
        if (out_time !== undefined) {
          updateQuery += ', out_time = ?';
          params.push(out_time);
        }
        
        updateQuery += ' WHERE id = ?';
        params.push(existing[0].id);
        
        await pool.query(updateQuery, params);
      } else {
        const [userRows]: any = await pool.query('SELECT branch_id FROM users WHERE id = ?', [user_id]);
        const branch_id = userRows[0]?.branch_id || null;

        await pool.query(
          'INSERT INTO attendance (user_id, date, status, in_time, out_time, notes, branch_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [user_id, date, status, in_time || null, out_time || null, notes || '', branch_id]
        );
      }
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to save attendance' });
    }
  });

  app.get("/api/salaries", async (req, res) => {
    try {
      const [rows] = await pool.query('SELECT * FROM salaries ORDER BY id DESC');
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: 'Database error' });
    }
  });

  app.delete("/api/attendance", async (req, res) => {
    try {
      const { user_id, date } = req.query;
      await pool.query('DELETE FROM attendance WHERE user_id = ? AND date = ?', [user_id, date]);
      res.status(204).send();
    } catch (err) {
      res.status(500).json({ error: 'Database error' });
    }
  });

  app.get("/api/holidays", async (req, res) => {
    try {
      const { month, year } = req.query;
      let query = 'SELECT * FROM holidays ORDER BY date ASC';
      let params: any[] = [];
      if (month && year) {
        query = 'SELECT * FROM holidays WHERE MONTH(date) = ? AND YEAR(date) = ? ORDER BY date ASC';
        params = [month, year];
      }
      const [rows] = await pool.query(query, params);
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: 'Database error' });
    }
  });

  app.post("/api/holidays", async (req, res) => {
    try {
      const { date, reason } = req.body;
      const [existing]: any = await pool.query('SELECT id FROM holidays WHERE date = ?', [date]);
      if (existing.length > 0) {
        await pool.query('UPDATE holidays SET reason = ? WHERE date = ?', [reason, date]);
      } else {
        await pool.query('INSERT INTO holidays (date, reason) VALUES (?, ?)', [date, reason]);
      }
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Failed to add holiday' });
    }
  });

  app.delete("/api/holidays/:id", async (req, res) => {
    try {
      await pool.query('DELETE FROM holidays WHERE id = ?', [req.params.id]);
      res.status(204).send();
    } catch (err) {
      res.status(500).json({ error: 'Database error' });
    }
  });

  app.delete("/api/branches/:id", async (req, res) => {
    try {
      await pool.query('UPDATE branches SET status = "inactive" WHERE id = ?', [req.params.id]);
      res.status(204).send();
    } catch (err) {
      res.status(500).json({ error: 'Database error' });
    }
  });

  app.delete("/api/companies/:id", async (req, res) => {
    try {
      await pool.query('DELETE FROM companies WHERE id = ?', [req.params.id]);
      res.status(204).send();
    } catch (err) {
      res.status(500).json({ error: 'Database error' });
    }
  });

  app.post("/api/employees", async (req, res) => {
    try {
      const data = req.body;
      const [result]: any = await pool.query(
        `INSERT INTO users (
          name, phone, email, password, role, branch_id, status, address, photo_url, join_date, salary, emergency_contact, date_of_birth
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          data.name, data.phone, data.email, data.password, data.role, data.branch_id || null, data.status || 'active',
          data.address, data.photo_url, data.join_date, data.salary, data.emergency_contact, data.date_of_birth
        ]
      );
      res.status(201).json({ id: result.insertId });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to create employee' });
    }
  });

  app.put("/api/employees/:id", async (req, res) => {
    try {
      const data = req.body;
      let query = `UPDATE users SET 
        name=?, phone=?, email=?, role=?, branch_id=?, status=?, address=?, photo_url=?, join_date=?, salary=?, emergency_contact=?, date_of_birth=?`;
      let params: any[] = [
        data.name, data.phone, data.email, data.role, data.branch_id || null, data.status,
        data.address, data.photo_url, data.join_date, data.salary, data.emergency_contact, data.date_of_birth
      ];

      if (data.password) {
        query += `, password=?`;
        params.push(data.password);
      }

      query += ` WHERE id=?`;
      params.push(req.params.id);

      await pool.query(query, params);
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to update employee' });
    }
  });

  app.delete("/api/employees/:id", async (req, res) => {
    try {
      await pool.query('DELETE FROM users WHERE id = ?', [req.params.id]);
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to delete employee' });
    }
  });

  app.get("/api/dashboard", verifyToken, async (req: any, res) => {
    try {
      const { role, branchId, userId } = req.user;
      let whereClause = "";
      const params: any[] = [];

      if (role === 'branch_manager') {
        whereClause = " WHERE branch_id = ?";
        params.push(branchId);
      } else if (['fo', 'am'].includes(role) && role !== 'am') { // For FO specifically
         // Dashboard is currently global, but let's at least protect it
      }

      // Use explain-friendly queries and combined lookups where possible
      const counts: any = await queryWithRetry(`
        SELECT 
          (SELECT COUNT(*) FROM branches) as branches,
          (SELECT COUNT(*) FROM members ${role === 'branch_manager' ? 'WHERE branch_id = ?' : ''}) as customers,
          (SELECT COUNT(*) FROM bank_accounts) as bank_accounts_count
      `, role === 'branch_manager' ? [branchId] : []);

      const loanStats: any = await queryWithRetry(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pendingCount,
          SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approvedCount,
          SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as activeCount
        FROM loans
        ${role === 'branch_manager' ? 'WHERE branch_id = ?' : ''}
      `, role === 'branch_manager' ? [branchId] : []);

      const collectionStats: any = await queryWithRetry(`
        SELECT 
          COALESCE(SUM(c.amount_paid), 0) as total,
          COUNT(*) as count
        FROM collections c
        ${role === 'branch_manager' ? 'JOIN loans l ON c.loan_id = l.id WHERE l.branch_id = ? AND c.status != "rejected"' : 'WHERE c.status != "rejected"'}
      `, role === 'branch_manager' ? [branchId] : []);

      const bankStats: any = await queryWithRetry('SELECT COALESCE(SUM(current_balance), 0) as total FROM bank_accounts');
      const capitalStats: any = await queryWithRetry('SELECT COALESCE(SUM(amount), 0) as total FROM company_capital');

      // Efficient Finance Stats with single join/aggregation
      const finStats: any = await queryWithRetry(`
        SELECT 
          SUM(l.amount) as totalPrincipal,
          SUM(l.total_repayment) as totalRepayment,
          (SELECT COALESCE(SUM(c.amount_paid), 0) 
           FROM collections c 
           JOIN loans l2 ON c.loan_id = l2.id 
           WHERE l2.status = 'active' AND c.status != 'rejected') as totalPaid
        FROM loans l
        WHERE l.status = 'active'
      `);

      const p = Number(finStats[0]?.totalPrincipal) || 0;
      const r = Number(finStats[0]?.totalRepayment) || 0;
      const pd = Number(finStats[0]?.totalPaid) || 0;

      // Trends: Optimized to use simple group by
      let trends = [];
      try {
        const trendRows: any = await queryWithRetry(`
          SELECT DATE_FORMAT(payment_date, '%b') as month, SUM(amount_paid) as amount 
          FROM collections 
          WHERE status != 'rejected'
          GROUP BY month 
          ORDER BY MIN(payment_date) ASC 
          LIMIT 6
        `);
        trends = trendRows;
      } catch (e) {
        trends = [{ month: 'Current', amount: collectionStats[0].total }];
      }

      res.json({
        branches: counts[0].branches,
        customers: counts[0].customers,
        totalLoans: loanStats[0].total,
        pendingLoans: loanStats[0].pendingCount,
        approvedLoans: loanStats[0].approvedCount,
        activeLoans: loanStats[0].activeCount,
        collections: collectionStats[0].total,
        totalBankBalance: Number(bankStats[0].total) || 0,
        totalCapital: Number(capitalStats[0].total) || 0,
        trends: trends.length > 0 ? trends : [{ month: 'Total', amount: collectionStats[0].total }],
        financeStats: {
          totalPrincipal: p,
          totalRepayment: r,
          totalPaid: pd,
          totalInterest: r - p,
          totalOutstanding: r - pd
        }
      });
    } catch (err) {
      console.error("Dashboard error:", err);
      res.status(500).json({ error: 'Database error' });
    }
  });

  app.get("/api/schemes", verifyToken, async (req, res) => {
    try {
      const [rows] = await pool.query('SELECT * FROM schemes ORDER BY created_at DESC');
      res.json(rows);
    } catch (err) {
      try {
        const [rows] = await pool.query('SELECT * FROM schemes');
        res.json(rows);
      } catch (e) {
        res.status(500).json({ error: 'Database error' });
      }
    }
  });

  app.get("/api/branches/:id", async (req, res) => {
    try {
      const [rows]: any = await pool.query('SELECT * FROM branches WHERE id = ?', [req.params.id]);
      if (rows.length === 0) return res.status(404).json({ error: 'Branch not found' });
      res.json(rows[0]);
    } catch (err) {
      res.status(500).json({ error: 'Database error' });
    }
  });

  app.put("/api/branches/:id", async (req, res) => {
    try {
      const data = req.body;
      await pool.query(
        `UPDATE branches SET 
          branch_name=?, branch_code=?, area=?, district=?, state=?, address=?, phone=?, email=?, 
          manager_name=?, manager_phone=?, opening_date=?, status=?, pincode=?
        WHERE id = ?`,
        [
          data.branch_name, data.branch_code, data.area, data.district, data.state, data.address, data.phone, data.email,
          data.manager_name, data.manager_phone, data.opening_date, data.status, data.pincode,
          req.params.id
        ]
      );
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Failed to update branch' });
    }
  });

  app.get("/api/companies/:id", async (req, res) => {
    try {
      const [rows]: any = await pool.query('SELECT * FROM companies WHERE id = ?', [req.params.id]);
      if (rows.length === 0) return res.status(404).json({ error: 'Company not found' });
      res.json(rows[0]);
    } catch (err) {
      res.status(500).json({ error: 'Database error' });
    }
  });

  app.put("/api/companies/:id", async (req, res) => {
    try {
      const data = req.body;
      await pool.query(
        `UPDATE companies SET 
          name=?, legal_name=?, registration_no=?, address=?, contact_no=?, email=?, logo_url=?
        WHERE id = ?`,
        [
          data.name, data.legal_name, data.registration_no, data.address, data.contact_no, data.email, data.logo_url,
          req.params.id
        ]
      );
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Failed to update company' });
    }
  });

  app.get("/api/schemes/:id", async (req, res) => {
    try {
      const [rows]: any = await pool.query('SELECT * FROM schemes WHERE id = ?', [req.params.id]);
      if (rows.length === 0) return res.status(404).json({ error: 'Scheme not found' });
      res.json(rows[0]);
    } catch (err) {
      res.status(500).json({ error: 'Database error' });
    }
  });

  app.put("/api/schemes/:id", async (req, res) => {
    try {
      const data = req.body;
      await pool.query(
        `UPDATE schemes SET 
          scheme_name=?, scheme_code=?, interest_rate=?, duration_months=?, description=?, 
          repayment_frequency=?, interest_type=?, processing_fee=?, processing_fee_type=?, 
          insurance_fee=?, insurance_fee_type=?, penalty_rate=?, status=?
        WHERE id = ?`,
        [
          data.scheme_name, data.scheme_code, data.interest_rate, data.duration_months, data.description,
          data.repayment_frequency, data.interest_type, data.processing_fee, data.processing_fee_type,
          data.insurance_fee, data.insurance_fee_type, data.penalty_rate, data.status,
          req.params.id
        ]
      );
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Failed to update scheme' });
    }
  });

  app.post("/api/shifting/group", async (req, res) => {
    try {
      const { memberIds, targetGroupId } = req.body;
      if (!targetGroupId || !memberIds || memberIds.length === 0) {
        return res.status(400).json({ error: 'Missing targetGroupId or memberIds' });
      }

      await pool.query(
        `UPDATE members SET group_id = ? WHERE id IN (?)`,
        [targetGroupId, memberIds]
      );
      
      res.json({ success: true, message: `${memberIds.length} members shifted to group ${targetGroupId}` });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: 'Failed to shift members' });
    }
  });

  app.post("/api/shifting/staff", async (req, res) => {
    try {
      const { groupIds, targetStaffId } = req.body;
      if (!targetStaffId || !groupIds || groupIds.length === 0) {
        return res.status(400).json({ error: 'Missing targetStaffId or groupIds' });
      }

      await pool.query(
        `UPDATE groups SET collector_id = ? WHERE id IN (?)`,
        [targetStaffId, groupIds]
      );
      
      res.json({ success: true, message: `${groupIds.length} groups shifted to staff ${targetStaffId}` });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: 'Failed to shift groups to new staff' });
    }
  });

  app.post("/api/shifting/day", async (req, res) => {
    try {
      const { groupIds, targetDay } = req.body;
      if (!targetDay || !groupIds || groupIds.length === 0) {
        return res.status(400).json({ error: 'Missing targetDay or groupIds' });
      }

      await pool.query(
        `UPDATE groups SET meeting_day = ? WHERE id IN (?)`,
        [targetDay, groupIds]
      );
      
      res.json({ success: true, message: `${groupIds.length} groups shifted to ${targetDay}` });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: 'Failed to shift days for groups' });
    }
  });

  app.put("/api/members/:id", async (req, res) => {
    try {
      const data = req.body;
      const id = req.params.id;
      
      // Clean data: convert empty strings to null for better DB compatibility
      const cleanData: any = {};
      Object.keys(data).forEach(key => {
        cleanData[key] = (data[key] === "" || data[key] === undefined) ? null : data[key];
      });

      // Ensure numeric fields are numbers or null
      const toInt = (val: any) => {
        if (val === null || val === undefined || val === "") return null;
        const parsed = parseInt(val);
        return isNaN(parsed) ? null : parsed;
      };

      const toFloat = (val: any) => {
        if (val === null || val === undefined || val === "") return null;
        const parsed = parseFloat(val);
        return isNaN(parsed) ? null : parsed;
      };

      await pool.query(
        `UPDATE members SET 
          full_name=?, aadhar_no=?, guardian_name=?, guardian_type=?, marital_status=?, gender=?, dob=?, age=?,
          religion=?, category=?, education=?, occupation=?, monthly_income=?, family_members=?, earning_members=?,
          house_type=?, residence_years=?, mobile_no=?, alt_mobile_no=?, pin_code=?, state=?, district=?,
          post_office=?, police_station=?, village=?, voter_id=?, pan_no=?, group_id=?,
          mem_bank_ifsc=?, mem_bank_name=?, mem_bank_ac=?, nominee_name=?, nominee_relation=?, nominee_aadhar=?,
          nominee_dob=?, nominee_age=?, profile_image=?, house_image=?, aadhar_f_image=?, aadhar_b_image=?,
          voter_f_image=?, voter_b_image=?, signature=?, status=?
        WHERE id = ?`,
        [
          cleanData.full_name, cleanData.aadhar_no, cleanData.guardian_name, cleanData.guardian_type, cleanData.marital_status, cleanData.gender, cleanData.dob, toInt(cleanData.age),
          cleanData.religion, cleanData.category, cleanData.education, cleanData.occupation, toFloat(cleanData.monthly_income), toInt(cleanData.family_members), toInt(cleanData.earning_members),
          cleanData.house_type, toInt(cleanData.residence_years), cleanData.mobile_no, cleanData.alt_mobile_no, cleanData.pin_code, cleanData.state, cleanData.district,
          cleanData.post_office, cleanData.police_station, cleanData.village, cleanData.voter_id, cleanData.pan_no, toInt(cleanData.group_id),
          cleanData.mem_bank_ifsc, cleanData.mem_bank_name, cleanData.mem_bank_ac, cleanData.nominee_name, cleanData.nominee_relation, cleanData.nominee_aadhar,
          cleanData.nominee_dob, toInt(cleanData.nominee_age), cleanData.profile_image, cleanData.house_image, cleanData.aadhar_image_front, cleanData.aadhar_image_back,
          cleanData.voter_image_front, cleanData.voter_image_back, cleanData.customer_signature, cleanData.status || 'Active',
          id
        ]
      );
      res.json({ success: true });
    } catch (err: any) {
      console.error('Update member error:', err.message);
      res.status(500).json({ error: 'Failed to update member: ' + err.message });
    }
  });

  app.get("/api/branches", verifyToken, async (req: any, res) => {
    try {
      const { role, branchId } = req.user;
      let query = 'SELECT * FROM branches';
      const params: any[] = [];
      
      if (role === 'branch_manager' || !['superadmin', 'dm', 'am'].includes(role)) {
        query += ' WHERE id = ?';
        params.push(branchId);
      }
      
      query += ' ORDER BY id DESC';
      const [rows] = await pool.query(query, params);
      res.json(rows);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Database error' });
    }
  });

  app.get("/api/loans", verifyToken, async (req: any, res) => {
    try {
      const { role, branchId, userId } = req.user;
      
      let whereClauses: string[] = [];
      const params: any[] = [];

      if (role === 'branch_manager') {
        whereClauses.push('l.branch_id = ?');
        params.push(branchId);
      } else if (!['superadmin', 'dm', 'am'].includes(role)) {
        whereClauses.push('g.collector_id = ?');
        params.push(userId);
      }

      const whereSql = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';

      // Optimized query: Moved collections sum to a pre-aggregated subquery joined once
      const rows: any = await queryWithRetry(`
        SELECT 
          l.*, 
          m.full_name as member_name, 
          m.member_code as member_code, 
          m.profile_image, 
          m.mobile_no as member_mobile, 
          m.group_id, 
          g.group_name, 
          g.meeting_day, 
          s.scheme_name, 
          s.interest_rate, 
          b.branch_name, 
          u.name as staff_name,
          COALESCE(c_stats.total_paid, 0) as total_paid,
          COALESCE(c_stats.paid_emi_count, 0) as paid_emi_count,
          u_closed.name as closed_by_name
        FROM loans l
        LEFT JOIN members m ON l.customer_id = m.id
        LEFT JOIN groups g ON m.group_id = g.id
        LEFT JOIN users u ON g.collector_id = u.id
        LEFT JOIN schemes s ON l.scheme_id = s.id
        LEFT JOIN branches b ON l.branch_id = b.id
        LEFT JOIN (
          SELECT 
            loan_id, 
            SUM(amount_paid) as total_paid, 
            COUNT(CASE WHEN amount_paid > 0 THEN 1 END) as paid_emi_count
          FROM collections 
          WHERE status != 'rejected'
          GROUP BY loan_id
        ) c_stats ON l.id = c_stats.loan_id
        LEFT JOIN (
          SELECT loan_id, approved_by FROM collections WHERE is_pre_close = 1 LIMIT 1
        ) c_closed ON l.id = c_closed.loan_id
        LEFT JOIN users u_closed ON c_closed.approved_by = u_closed.id
        ${whereSql}
        GROUP BY l.id
        ORDER BY l.created_at DESC
      `, params);
      res.json(rows);
    } catch (err) {
      console.error("Loans query error:", err);
      try {
        const rows: any = await queryWithRetry('SELECT * FROM loans ORDER BY created_at DESC LIMIT 1000');
        res.json(rows);
      } catch (e) {
        res.status(500).json({ error: 'Database error' });
      }
    }
  });

  app.post("/api/loans", verifyToken, async (req: any, res) => {
    try {
      const data = req.body;
      
      // Calculate start_date based on group meeting day and frequency if not provided
      let startDate = new Date();
      if (data.start_date) {
        startDate = new Date(data.start_date);
      } else {
        startDate.setHours(0, 0, 0, 0);

        try {
          const [memberRows]: any = await pool.query(
            `SELECT g.meeting_day FROM members m LEFT JOIN groups g ON m.group_id = g.id WHERE m.id = ?`,
            [data.customer_id]
          );
          if (memberRows.length > 0 && memberRows[0].meeting_day) {
            const meetingDayStr = memberRows[0].meeting_day;
            const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            const targetDay = days.indexOf(meetingDayStr);
            const freq = data.emi_frequency || 'weekly';

            if (targetDay !== -1) {
              let daysUntil = targetDay - startDate.getDay();
              if (daysUntil <= 0) daysUntil += 7;

              if (freq === 'daily') {
                startDate.setDate(startDate.getDate() + 1);
              } else if (freq === 'weekly') {
                startDate.setDate(startDate.getDate() + daysUntil);
              } else if (freq === 'bi-weekly') {
                startDate.setDate(startDate.getDate() + daysUntil + 7);
              } else if (freq === 'monthly') {
                startDate.setMonth(startDate.getMonth() + 1);
                let diff = targetDay - startDate.getDay();
                if (diff < 0) diff += 7;
                startDate.setDate(startDate.getDate() + diff);
              }
            }
          }
        } catch (e) {
          console.error('Error calculating start date:', e);
        }
      }

      const [result]: any = await pool.query(
        `INSERT INTO loans (
          customer_id, scheme_id, amount, duration_weeks,
          interest, installment, start_date, status, branch_id,
          total_repayment, processing_fee, insurance_fee, emi_frequency
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          data.customer_id, data.scheme_id, data.loan_amount, data.no_of_emis,
          data.interest_amount, data.emi_amount, startDate, data.status, data.branch_id,
          data.total_repayment, data.processing_fee, data.insurance_fee, data.emi_frequency
        ]
      );
      
      const insertId = result.insertId;
      const loanNo = `LN-${new Date().getFullYear()}-${insertId.toString().padStart(4, '0')}`;
      await pool.query('UPDATE loans SET loan_no = ? WHERE id = ?', [loanNo, insertId]);

      res.status(201).json({ id: insertId, loan_no: loanNo });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: 'Failed to create loan request' });
    }
  });

  app.get("/api/loans/:id", async (req, res) => {
    try {
      const [rows]: any = await pool.query(`
        SELECT l.*, 
               m.full_name as member_name, m.member_code, m.mobile_no, m.profile_image, 
               m.house_image, m.aadhar_f_image, m.aadhar_b_image, m.voter_f_image, m.voter_b_image, m.signature,
               m.village, m.post_office, m.police_station, m.district, m.state, m.pin_code,
               m.guardian_name, m.guardian_type, m.dob, m.occupation, m.aadhar_no, m.voter_id,
               m.nominee_name, m.nominee_relation,
               s.scheme_name, s.interest_rate, b.branch_name, g.group_name 
        FROM loans l
        LEFT JOIN members m ON l.customer_id = m.id
        LEFT JOIN schemes s ON l.scheme_id = s.id
        LEFT JOIN branches b ON l.branch_id = b.id
        LEFT JOIN groups g ON m.group_id = g.id
        WHERE l.id = ?
      `, [req.params.id]);
      
      if (rows.length === 0) return res.status(404).json({ error: 'Loan not found' });
      res.json(rows[0]);
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: 'Database error' });
    }
  });

  app.put("/api/loans/:id", async (req, res) => {
    try {
      const data = req.body;
      let startDateStr = data.start_date;
      if (!startDateStr) {
         let start = new Date();
         start.setHours(0,0,0,0);
         // Fallback start date if not provided in put
         try {
           const [memberRows]: any = await pool.query(
             `SELECT g.meeting_day FROM members m LEFT JOIN groups g ON m.group_id = g.id WHERE m.id = ?`,
             [data.customer_id]
           );
           if (memberRows.length > 0 && memberRows[0].meeting_day) {
             const meetingDayStr = memberRows[0].meeting_day;
             const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
             const targetDay = days.indexOf(meetingDayStr);
             const freq = data.emi_frequency || 'weekly';

             if (targetDay !== -1) {
               let daysUntil = targetDay - start.getDay();
               if (daysUntil <= 0) daysUntil += 7;
               if (freq === 'daily') start.setDate(start.getDate() + 1);
               else if (freq === 'weekly') start.setDate(start.getDate() + daysUntil);
               else if (freq === 'bi-weekly') start.setDate(start.getDate() + daysUntil + 7);
               else if (freq === 'monthly') {
                 start.setMonth(start.getMonth() + 1);
                 let diff = targetDay - start.getDay();
                 if (diff < 0) diff += 7;
                 start.setDate(start.getDate() + diff);
               }
             }
           }
         } catch(e){}
         startDateStr = start.toISOString().split('T')[0];
      }
      
      await pool.query(
        `UPDATE loans SET 
          customer_id = ?, scheme_id = ?, amount = ?, duration_weeks = ?,
          interest = ?, branch_id = ?, start_date = ?
         WHERE id = ?`,
        [
          data.customer_id, data.scheme_id, data.amount, data.duration_weeks,
          data.interest, data.branch_id, startDateStr, req.params.id
        ]
      );
      res.status(200).json({ success: true });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: 'Failed to update loan' });
    }
  });

  app.delete("/api/loans/:id", async (req, res) => {
    try {
      await pool.query('DELETE FROM loans WHERE id = ?', [req.params.id]);
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Database error' });
    }
  });

  app.put("/api/loans/:id/status", async (req, res) => {
    try {
      const { status } = req.body;
      const validStatuses = ['pending', 'approved', 'active', 'closed', 'rejected'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }

      await pool.query(
        'UPDATE loans SET status = ? WHERE id = ?',
        [status, req.params.id]
      );
      res.json({ success: true, status });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Database error' });
    }
  });

  app.post("/api/loans/:id/pre-close", verifyToken, async (req: any, res) => {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      
      const loanId = req.params.id;
      const { settlement_amount, payment_mode } = req.body;
      const { userId } = req.user;
      
      // Find branch_id for the loan
      let branch_id = 1;
      const [loanRows]: any = await conn.query('SELECT branch_id FROM loans WHERE id = ?', [loanId]);
      if (loanRows && loanRows.length > 0) {
         branch_id = loanRows[0].branch_id;
      }

      const today = new Date().toISOString().split('T')[0];
      
      await conn.query(
        `INSERT INTO collections (loan_id, amount_paid, payment_date, collected_by, branch_id, is_pre_close, status)
         VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
        [loanId, Number(settlement_amount), today, userId, branch_id, true]
      );
      
      await conn.commit();
      res.json({ success: true });
    } catch (err: any) {
      await conn.rollback();
      console.error(err);
      res.status(500).json({ error: 'Failed to pre-close loan: ' + err.message });
    } finally {
      conn.release();
    }
  });

  app.get("/api/collections", verifyToken, async (req: any, res) => {
    try {
      const { role, userId, branchId } = req.user;
      let query = `
        SELECT c.*, l.customer_id, m.full_name as customer_name, u.name as collected_by_name, u2.name as approved_by_name, u2.role as approved_by_role 
        FROM collections c
        LEFT JOIN loans l ON c.loan_id = l.id
        LEFT JOIN members m ON l.customer_id = m.id
        LEFT JOIN groups g ON m.group_id = g.id
        LEFT JOIN users u ON c.collected_by = u.id
        LEFT JOIN users u2 ON c.approved_by = u2.id
      `;
      let whereClauses: string[] = [];
      let params: any[] = [];

      if (role === 'branch_manager') {
        whereClauses.push('(u.branch_id = ? OR g.branch_id = ?)');
        params.push(branchId, branchId);
      } else if (!['superadmin', 'dm', 'am'].includes(role)) {
        whereClauses.push('c.collected_by = ?');
        params.push(userId);
      }

      if (whereClauses.length > 0) {
        query += ' WHERE ' + whereClauses.join(' AND ');
      }
      query += ' ORDER BY c.created_at DESC LIMIT 1000';

      const [rows] = await pool.query(query, params);
      res.json(rows);
    } catch (err) {
      // Fallback if joins fail
      try {
        const [rows] = await pool.query('SELECT * FROM collections ORDER BY created_at DESC');
        res.json(rows);
      } catch (fallbackErr) {
        res.status(500).json({ error: 'Database error' });
      }
    }
  });

  app.post("/api/collections", verifyToken, async (req: any, res) => {
    try {
      const data = req.body;
      const { userId } = req.user;
      
      // Get branch_id from loan to keep things simple
      let branch_id = 1;
      try {
         const [loanRows]: any = await pool.query('SELECT branch_id FROM loans WHERE id = ?', [data.loan_id]);
         if (loanRows && loanRows.length > 0) {
            branch_id = loanRows[0].branch_id;
         }
      } catch (err) {}

      const [result]: any = await pool.query(
        `INSERT INTO collections (loan_id, amount_paid, payment_date, collected_by, branch_id, status)
         VALUES (?, ?, ?, ?, ?, 'pending')`,
        [data.loan_id, data.amount_paid, data.payment_date || new Date().toISOString().split('T')[0], userId, branch_id]
      );
      res.status(201).json({ id: result.insertId });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: 'Failed to create collection: ' + err.message });
    }
  });

  app.put("/api/collections/:id", async (req, res) => {
    try {
      const data = req.body;
      await pool.query(
        'UPDATE collections SET loan_id=?, amount_paid=?, payment_date=?, payment_method=?, remarks=? WHERE id=?',
        [data.loan_id, data.amount_paid, data.payment_date, data.payment_method || null, data.remarks || null, req.params.id]
      );
      res.json({ success: true });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: 'Failed to update collection' });
    }
  });

  app.delete("/api/collections/:id", async (req, res) => {
    try {
      await pool.query('DELETE FROM collections WHERE id = ?', [req.params.id]);
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to delete collection' });
    }
  });

  // --- Bank Accounts Routes ---
  app.get("/api/banks", verifyToken, async (req, res) => {
    try {
      const [rows] = await pool.query('SELECT * FROM bank_accounts ORDER BY id DESC');
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: 'Database error' });
    }
  });

  app.post("/api/banks", verifyToken, async (req, res) => {
    try {
      const data = req.body;
      const [result]: any = await pool.query(
        `INSERT INTO bank_accounts (
          bank_name, account_number, ifsc_code, branch_name, account_name, opening_balance, current_balance, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          data.bank_name, data.account_number, data.ifsc_code, data.branch_name, data.account_name,
          data.opening_balance || 0, data.opening_balance || 0, data.status || 'active'
        ]
      );
      res.status(201).json({ id: result.insertId });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: 'Failed to add bank account' });
    }
  });

  app.put("/api/banks/:id", async (req, res) => {
    try {
      const data = req.body;
      await pool.query(
        `UPDATE bank_accounts SET 
          bank_name=?, account_number=?, ifsc_code=?, branch_name=?, account_name=?, status=?
        WHERE id = ?`,
        [
          data.bank_name, data.account_number, data.ifsc_code, data.branch_name, data.account_name, data.status,
          req.params.id
        ]
      );
      res.json({ success: true });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: 'Failed to update bank account' });
    }
  });

  app.delete("/api/banks/:id", async (req, res) => {
    try {
      await pool.query('DELETE FROM bank_accounts WHERE id = ?', [req.params.id]);
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to delete bank account' });
    }
  });

  // --- IFSC Proxy Routes ---
  app.get("/api/ifsc/:code", async (req, res) => {
    try {
      const code = req.params.code;
      const response = await fetch(`https://ifsc.razorpay.com/${code}`, {
        headers: {
          'x-api-key': '8f901ff3-7f5f-4fd4-97c4-af65bda70cac',
          'Authorization': 'Bearer 8f901ff3-7f5f-4fd4-97c4-af65bda70cac'
        }
      });
      if (!response.ok) {
        return res.status(response.status).json({ error: 'Failed to fetch IFSC details' });
      }
      const data = await response.json();
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch IFSC details' });
    }
  });

  // --- Bank Transactions Routes ---
  app.get("/api/banks/:id/transactions", async (req, res) => {
    try {
      const [rows] = await pool.query(`
        SELECT t.*, b.branch_name 
        FROM bank_transactions t
        LEFT JOIN branches b ON t.source_type = 'branch' AND t.source_id = b.id
        WHERE t.bank_id = ?
        ORDER BY t.date DESC, t.id DESC
      `, [req.params.id]);
      res.json(rows);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch bank transactions' });
    }
  });

  app.post("/api/banks/:id/transactions", async (req, res) => {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const bankId = req.params.id;
      const { date, type, source_type, source_id, amount, purpose } = req.body;
      
      await conn.query(
        `INSERT INTO bank_transactions (bank_id, date, type, source_type, source_id, amount, purpose) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [bankId, date, type, source_type, source_id || null, amount, purpose]
      );

      const op = type === 'deposit' ? '+' : '-';
      await conn.query(
        `UPDATE bank_accounts SET current_balance = current_balance ${op} ? WHERE id = ?`,
        [amount, bankId]
      );

      await conn.commit();
      res.status(201).json({ success: true });
    } catch (err) {
      await conn.rollback();
      console.error(err);
      res.status(500).json({ error: 'Failed to add transaction' });
    } finally {
      conn.release();
    }
  });

  // --- Investor Routes ---
  app.get("/api/investors", async (req, res) => {
    try {
      const [rows] = await pool.query('SELECT * FROM investors ORDER BY name ASC');
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: 'Database error' });
    }
  });

  app.post("/api/investors", async (req, res) => {
    try {
      const { name, mobile, address, photo, id_proof } = req.body;
      const [result]: any = await pool.query(
        'INSERT INTO investors (name, mobile, address, photo, id_proof) VALUES (?, ?, ?, ?, ?)',
        [name, mobile || null, address || null, photo || null, id_proof || null]
      );
      
      const insertId = result.insertId;
      const [newRes]: any = await pool.query('SELECT * FROM investors WHERE id = ?', [insertId]);
      
      res.status(201).json(newRes[0]);
    } catch (err) {
      res.status(500).json({ error: 'Failed to add investor' });
    }
  });

  // --- Capital Routes ---
  app.get("/api/capital", verifyToken, async (req, res) => {
    try {
      const [rows] = await pool.query(`
        SELECT c.*, b.bank_name, b.account_number, i.name as investor_name, i.mobile as investor_mobile, i.address as investor_address
        FROM company_capital c 
        LEFT JOIN bank_accounts b ON c.bank_id = b.id 
        LEFT JOIN investors i ON c.investor_id = i.id
        ORDER BY c.date DESC, c.id DESC
      `);
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: 'Database error' });
    }
  });

  app.post("/api/capital", verifyToken, async (req, res) => {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const data = req.body;
      const [result]: any = await conn.query(
        `INSERT INTO company_capital (date, amount, payment_method, bank_id, source_type, source_name, source_mobile, source_address, investor_id, remarks) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [data.date, data.amount, data.payment_method, data.bank_id || null, data.source_type || 'self', data.source_name || '', data.source_mobile || '', data.source_address || '', data.investor_id || null, data.remarks || '']
      );
      
      // Update bank account balance if applicable
      if (data.bank_id && data.payment_method === 'bank') {
        await conn.query(
          `UPDATE bank_accounts SET current_balance = current_balance + ? WHERE id = ?`,
          [data.amount, data.bank_id]
        );
        await conn.query(
          `INSERT INTO bank_transactions (bank_id, date, type, source_type, source_id, amount, purpose) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [data.bank_id, data.date, 'deposit', 'capital', result.insertId, data.amount, 'Capital Investment']
        );
      }
      
      await conn.commit();
      res.status(201).json({ id: result.insertId });
    } catch (err: any) {
      await conn.rollback();
      console.error(err);
      res.status(500).json({ error: 'Failed to add capital' });
    } finally {
      conn.release();
    }
  });

  app.delete("/api/capital/:id", async (req, res) => {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      
      // Get the capital record
      const [rows]: any = await conn.query('SELECT amount, payment_method, bank_id FROM company_capital WHERE id = ?', [req.params.id]);
      if (rows.length === 0) throw new Error('Capital record not found');
      const capital = rows[0];

      // Delete the capital record
      await conn.query('DELETE FROM company_capital WHERE id = ?', [req.params.id]);
      
      // Revert bank account balance
      if (capital.bank_id && capital.payment_method === 'bank') {
        await conn.query(
          `UPDATE bank_accounts SET current_balance = current_balance - ? WHERE id = ?`,
          [capital.amount, capital.bank_id]
        );
        await conn.query(
          `DELETE FROM bank_transactions WHERE bank_id = ? AND source_type = 'capital' AND source_id = ?`,
          [capital.bank_id, req.params.id]
        );
      }
      
      await conn.commit();
      res.json({ success: true });
    } catch (err) {
      await conn.rollback();
      console.error(err);
      res.status(500).json({ error: 'Failed to delete capital' });
    } finally {
      conn.release();
    }
  });

  app.put("/api/collections/:id/status", verifyToken, async (req: any, res) => {
    try {
      const { status } = req.body;
      const { userId } = req.user;
      const validStatuses = ['pending', 'approved', 'rejected'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }

      const [colRows]: any = await pool.query('SELECT loan_id, is_pre_close, amount_paid FROM collections WHERE id = ?', [req.params.id]);
      if (!colRows || colRows.length === 0) {
        return res.status(404).json({ error: 'Collection not found' });
      }

      const loanId = colRows[0].loan_id;

      await pool.query(
        'UPDATE collections SET status = ?, approved_by = ?, approved_at = NOW() WHERE id = ?',
        [status, userId, req.params.id]
      );
      
      if (status === 'approved') {
        // Option 1: It's an explicit pre-close
        if (colRows[0].is_pre_close) {
          await pool.query('UPDATE loans SET status = ? WHERE id = ?', ['closed', loanId]);
        } else {
          // Option 2: Regular collection. Check if total paid >= total repayment
          const [loanRows]: any = await pool.query('SELECT total_repayment FROM loans WHERE id = ?', [loanId]);
          if (loanRows.length > 0) {
            const totalRepayment = Number(loanRows[0].total_repayment);
            
            const [sumRows]: any = await pool.query(
              'SELECT SUM(amount_paid) as total_paid FROM collections WHERE loan_id = ? AND status = "approved"',
              [loanId]
            );
            const totalPaid = Number(sumRows[0].total_paid || 0);

            if (totalPaid >= totalRepayment) {
              await pool.query('UPDATE loans SET status = ? WHERE id = ?', ['closed', loanId]);
            }
          }
        }
      }
      
      res.json({ success: true, status });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Database error' });
    }
  });

  app.get("/api/groups/:id", async (req, res) => {
    try {
      const [rows]: any = await pool.query('SELECT * FROM groups WHERE id = ?', [req.params.id]);
      if (rows.length === 0) return res.status(404).json({ error: 'Group not found' });
      
      const groupData = rows[0];
      const [leaders]: any = await pool.query('SELECT * FROM group_leaders WHERE group_id = ?', [req.params.id]);
      groupData.leader = leaders[0] || null;

      res.json(groupData);
    } catch (err: any) {
      res.status(500).json({ error: 'Database error: ' + err.message });
    }
  });

  app.post("/api/groups", async (req, res) => {
    try {
      const data = req.body;
      const group_code = `GRP-${String(Math.floor(1 + Math.random() * 999)).padStart(3, '0')}`;
      const center_code = data.center_code || `CNT-${String(Math.floor(1 + Math.random() * 999)).padStart(3, '0')}`;
      
      const [result]: any = await pool.query(
        `INSERT INTO groups (
          group_name, group_code, branch_id, collector_id, meeting_day, description, status,
          center_name, center_code, village, meeting_location, formation_date, meeting_time, collection_type
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          data.group_name, group_code, data.branch_id, data.collector_id || null,
          data.meeting_day, data.description, data.status || 'Active',
          data.center_name, center_code, data.village, data.meeting_location, data.formation_date || null, data.meeting_time, data.collection_type || 'Weekly'
        ]
      );
      
      const groupId = result.insertId;

      if (data.leader) {
         await pool.query(
           `INSERT INTO group_leaders (group_id, name, mobile, alt_mobile, address, occupation, id_proof, photo_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
           [groupId, data.leader.name, data.leader.mobile, data.leader.alt_mobile, data.leader.address, data.leader.occupation, data.leader.id_proof || null, data.leader.photo_url || null]
         );
      }

      res.status(201).json({ id: groupId, group_code });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: 'Failed to create group: ' + err.message });
    }
  });

  app.put("/api/groups/:id", async (req, res) => {
    try {
      const data = req.body;
      await pool.query(
        `UPDATE groups SET 
          group_name=?, branch_id=?, collector_id=?, meeting_day=?, description=?, status=?,
          center_name=?, center_code=COALESCE(?, center_code), village=?, meeting_location=?, formation_date=?, meeting_time=?, collection_type=?
        WHERE id = ?`,
        [
          data.group_name, data.branch_id, data.collector_id || null,
          data.meeting_day, data.description, data.status,
          data.center_name, data.center_code || null, data.village, data.meeting_location, data.formation_date || null, data.meeting_time, data.collection_type || 'Weekly',
          req.params.id
        ]
      );
      
      if (data.leader) {
         const [existingLeader]: any = await pool.query('SELECT id FROM group_leaders WHERE group_id = ?', [req.params.id]);
         if (existingLeader.length > 0) {
           await pool.query(
             `UPDATE group_leaders SET name = ?, mobile = ?, alt_mobile = ?, address = ?, occupation = ?, id_proof = COALESCE(?, id_proof), photo_url = COALESCE(?, photo_url) WHERE group_id = ?`,
             [data.leader.name, data.leader.mobile, data.leader.alt_mobile, data.leader.address, data.leader.occupation, data.leader.id_proof || null, data.leader.photo_url || null, req.params.id]
           );
         } else {
           await pool.query(
             `INSERT INTO group_leaders (group_id, name, mobile, alt_mobile, address, occupation, id_proof, photo_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
             [req.params.id, data.leader.name, data.leader.mobile, data.leader.alt_mobile, data.leader.address, data.leader.occupation, data.leader.id_proof || null, data.leader.photo_url || null]
           );
         }
      }

      res.json({ success: true });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: 'Failed to update group: ' + err.message });
    }
  });

  app.get("/api/companies", verifyToken, async (req, res) => {
    try {
      const [rows] = await pool.query('SELECT * FROM companies ORDER BY name ASC');
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: 'Database error' });
    }
  });

  app.get("/api/groups", verifyToken, async (req: any, res) => {
    try {
      const { role, branchId, userId } = req.user;
      
      let query = `
        SELECT g.*, 
               b.branch_name, 
               s.name as collector_name,
               l.name as leaderName,
               l.mobile as leaderMobile
        FROM groups g
        LEFT JOIN branches b ON g.branch_id = b.id
        LEFT JOIN users s ON g.collector_id = s.id
        LEFT JOIN group_leaders l ON g.id = l.group_id
      `;
      const params: any[] = [];
      let whereClauses: string[] = [];

      if (role === 'branch_manager') {
        whereClauses.push('g.branch_id = ?');
        params.push(branchId);
      } else if (!['superadmin', 'dm', 'am'].includes(role)) {
        // Assume anything else is STAFF/employee
        whereClauses.push('g.collector_id = ?');
        params.push(userId);
      }

      if (whereClauses.length > 0) {
        query += ' WHERE ' + whereClauses.join(' AND ');
      }

      query += ' ORDER BY g.group_name ASC';

      const [rows] = await pool.query(query, params);
      res.json(rows);
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: 'Database error: ' + err.message });
    }
  });

  app.get("/api/members", verifyToken, async (req: any, res) => {
    try {
      const { role, branchId, userId } = req.user;
      
      let query = `
        SELECT m.*, g.group_name, g.branch_id as group_branch_id, g.meeting_day
        FROM members m 
        LEFT JOIN groups g ON m.group_id = g.id 
      `;
      const params: any[] = [];
      let whereClauses: string[] = [];

      if (role === 'branch_manager') {
        whereClauses.push('(m.branch_id = ? OR g.branch_id = ?)');
        params.push(branchId, branchId);
      } else if (!['superadmin', 'dm', 'am'].includes(role)) {
        // Assume anything else is STAFF/employee
        whereClauses.push('g.collector_id = ?');
        params.push(userId);
      }

      if (whereClauses.length > 0) {
        query += ' WHERE ' + whereClauses.join(' AND ');
      }

      query += ' ORDER BY m.created_at DESC';

      const [rows]: any = await pool.query(query, params);
      const mappedRows = rows.map((member: any) => ({
        ...member,
        branch_id: member.branch_id || member.group_branch_id,
        aadhar_image_front: member.aadhar_f_image,
        aadhar_image_back: member.aadhar_b_image,
        voter_image_front: member.voter_f_image,
        voter_image_back: member.voter_b_image,
        customer_signature: member.signature
      }));
      res.json(mappedRows);
    } catch (err) {
      try {
        const [rows]: any = await pool.query('SELECT * FROM members ORDER BY id DESC');
        const mappedRows = rows.map((member: any) => ({
          ...member,
          aadhar_image_front: member.aadhar_f_image,
          aadhar_image_back: member.aadhar_b_image,
          voter_image_front: member.voter_f_image,
          voter_image_back: member.voter_b_image,
          customer_signature: member.signature
        }));
        res.json(mappedRows);
      } catch (e) {
        res.status(500).json({ error: 'Database error' });
      }
    }
  });

  app.get("/api/members/:id/loans", async (req, res) => {
    try {
      const { id } = req.params;
      const [rows] = await pool.query(`
        SELECT l.*, s.scheme_name, s.interest_rate, b.branch_name,
        (SELECT COALESCE(SUM(amount_paid), 0) FROM collections WHERE loan_id = l.id AND status != 'rejected') as total_paid,
        (SELECT COUNT(id) FROM collections WHERE loan_id = l.id AND status != 'rejected' AND amount_paid > 0) as paid_emi_count
        FROM loans l
        LEFT JOIN schemes s ON l.scheme_id = s.id
        LEFT JOIN branches b ON l.branch_id = b.id
        WHERE l.customer_id = ?
        ORDER BY l.created_at DESC
      `, [id]);
      res.json(rows);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Database error fetching member loans' });
    }
  });

  app.get("/api/members/:id", async (req, res) => {
    try {
      const [rows]: any = await pool.query('SELECT * FROM members WHERE id = ?', [req.params.id]);
      if (rows.length === 0) return res.status(404).json({ error: 'Member not found' });
      
      const member = rows[0];
      // Map DB columns to frontend expected keys
      const mappedMember = {
        ...member,
        aadhar_image_front: member.aadhar_f_image,
        aadhar_image_back: member.aadhar_b_image,
        voter_image_front: member.voter_f_image,
        voter_image_back: member.voter_b_image,
        customer_signature: member.signature
      };
      
      res.json(mappedMember);
    } catch (err) {
      res.status(500).json({ error: 'Database error' });
    }
  });

  app.post("/api/members", async (req, res) => {
    try {
      const data = req.body;
      
      // Clean data: convert empty strings to null for better DB compatibility
      const cleanData: any = {};
      Object.keys(data).forEach(key => {
        cleanData[key] = (data[key] === "" || data[key] === undefined) ? null : data[key];
      });

      // Ensure numeric fields are numbers or null
      const toInt = (val: any) => {
        if (val === null || val === undefined || val === "") return null;
        const parsed = parseInt(val);
        return isNaN(parsed) ? null : parsed;
      };

      const toFloat = (val: any) => {
        if (val === null || val === undefined || val === "") return null;
        const parsed = parseFloat(val);
        return isNaN(parsed) ? null : parsed;
      };

      const member_code = `MEM-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const [result]: any = await pool.query(
        `INSERT INTO members (
          member_code, full_name, aadhar_no, guardian_name, guardian_type, marital_status, gender, dob, age,
          religion, category, education, occupation, monthly_income, family_members, earning_members,
          house_type, residence_years, mobile_no, alt_mobile_no, pin_code, state, district,
          post_office, police_station, village, voter_id, pan_no, group_id, 
          mem_bank_ifsc, mem_bank_name, mem_bank_ac, nominee_name, nominee_relation, nominee_aadhar,
          nominee_dob, nominee_age, profile_image, house_image, aadhar_f_image, aadhar_b_image,
          voter_f_image, voter_b_image, signature, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          member_code, cleanData.full_name, cleanData.aadhar_no, cleanData.guardian_name, cleanData.guardian_type, cleanData.marital_status, cleanData.gender, cleanData.dob, toInt(cleanData.age),
          cleanData.religion, cleanData.category, cleanData.education, cleanData.occupation, toFloat(cleanData.monthly_income), toInt(cleanData.family_members), toInt(cleanData.earning_members),
          cleanData.house_type, toInt(cleanData.residence_years), cleanData.mobile_no, cleanData.alt_mobile_no, cleanData.pin_code, cleanData.state, cleanData.district,
          cleanData.post_office, cleanData.police_station, cleanData.village, cleanData.voter_id, cleanData.pan_no, toInt(cleanData.group_id),
          cleanData.mem_bank_ifsc, cleanData.mem_bank_name, cleanData.mem_bank_ac, cleanData.nominee_name, cleanData.nominee_relation, cleanData.nominee_aadhar,
          cleanData.nominee_dob, toInt(cleanData.nominee_age), cleanData.profile_image, cleanData.house_image, cleanData.aadhar_image_front, cleanData.aadhar_image_back,
          cleanData.voter_image_front, cleanData.voter_image_back, cleanData.customer_signature, cleanData.status || 'Active'
        ]
      );
      res.status(201).json({ id: result.insertId, member_code });
    } catch (err: any) {
      console.error('Create member error:', err.message);
      res.status(500).json({ error: 'Failed to create member: ' + err.message });
    }
  });

  app.post("/api/branches", async (req, res) => {
    try {
      const data = req.body;
      const branch_code = `BR-${Math.floor(1000 + Math.random() * 8999)}`;
      const [result]: any = await pool.query(
        `INSERT INTO branches (
          company_id, branch_name, branch_code, area, district, state, address, phone, email,
          manager_name, manager_phone, opening_date, status, pincode
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          data.company_id || 1, data.branch_name, data.branch_code || branch_code, data.area, data.district, data.state, 
          data.address, data.phone, data.email, data.manager_name, data.manager_phone, 
          data.opening_date, data.status || 'active', data.pincode
        ]
      );
      res.status(201).json({ id: result.insertId });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to create branch' });
    }
  });

  app.post("/api/companies", async (req, res) => {
    try {
      const data = req.body;
      const [result]: any = await pool.query(
        `INSERT INTO companies (
          name, legal_name, registration_no, address, contact_no, email, logo_url
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [data.name, data.legal_name, data.registration_no, data.address, data.contact_no, data.email, data.logo_url]
      );
      res.status(201).json({ id: result.insertId });
    } catch (err) {
      res.status(500).json({ error: 'Failed to create company' });
    }
  });

  app.post("/api/schemes", async (req, res) => {
    try {
      const data = req.body;
      const scheme_code = data.scheme_code || `SC-${Math.floor(1000 + Math.random() * 8999)}`;
      const [result]: any = await pool.query(
        `INSERT INTO schemes (
          scheme_name, scheme_code, interest_rate, duration_months, description,
          repayment_frequency, interest_type, processing_fee, processing_fee_type,
          insurance_fee, insurance_fee_type, penalty_rate, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          data.scheme_name, scheme_code, data.interest_rate, data.duration_months, data.description,
          data.repayment_frequency, data.interest_type, data.processing_fee, data.processing_fee_type,
          data.insurance_fee, data.insurance_fee_type, data.penalty_rate, data.status || 'active'
        ]
      );
      res.status(201).json({ id: result.insertId });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to create scheme' });
    }
  });

  // --- Day Book Route ---
  app.get("/api/daybook", verifyToken, async (req: any, res) => {
    try {
      const { role, branchId: userBranchId } = req.user;
      const date = req.query.date as string || new Date().toISOString().split('T')[0];
      let branch_id = req.query.branch_id as string;
      
      // Override for branch manager
      if (role === 'branch_manager' || !['superadmin', 'dm', 'am'].includes(role)) {
        branch_id = userBranchId.toString();
      }
      
      const branchFilter = branch_id ? 'AND c.branch_id = ?' : '';
      const params = branch_id ? [date, branch_id] : [date];

      // 1. Collections (Receipts)
      const [collections]: any = await pool.query(
        `SELECT c.*, m.full_name as member_name, b.branch_name 
         FROM collections c
         LEFT JOIN branches b ON c.branch_id = b.id
         LEFT JOIN loans l ON c.loan_id = l.id
         LEFT JOIN members m ON l.customer_id = m.id
         WHERE DATE(c.payment_date) = ? AND c.status != 'rejected' ${branchFilter}`,
        params
      );

      // 2. Loan Disbursements (Payments)
      const [disbursements]: any = await pool.query(
        `SELECT l.*, m.full_name as member_name, b.branch_name 
         FROM loans l
         LEFT JOIN branches b ON l.branch_id = b.id
         LEFT JOIN members m ON l.customer_id = m.id
         WHERE DATE(l.start_date) = ? AND l.status IN ('active', 'closed') ${branch_id ? 'AND l.branch_id = ?' : ''}`,
        params
      );

      // 3. Salaries Paid (Payments)
      const [salaries]: any = await pool.query(
        `SELECT s.*, u.name as employee_name, b.branch_name 
         FROM salaries s
         LEFT JOIN branches b ON s.branch_id = b.id
         LEFT JOIN users u ON s.user_id = u.id
         WHERE DATE(s.payment_date) = ? ${branch_id ? 'AND s.branch_id = ?' : ''}`,
        params
      );

      // 4. Capital Transactions (Receipts / Payments)
      let capital: any[] = [];
      if (!branch_id) {
        const [capRows]: any = await pool.query(
          `SELECT * FROM company_capital WHERE DATE(date) = ?`,
          [date]
        );
        capital = capRows;
      }
      
      // 5. Bank Transactions (Bank to Cash or Cash to Bank)
      const [bankTxns]: any = await pool.query(
        `SELECT t.*, b.bank_name, b.account_number 
         FROM bank_transactions t
         LEFT JOIN bank_accounts b ON t.bank_id = b.id
         WHERE DATE(t.date) = ? ${branch_id ? "AND t.source_type = 'branch' AND t.source_id = ?" : ''}`,
         params
      );

      // 6. Expenses
      const [expenses]: any = await pool.query(
        `SELECT e.*, b.branch_name 
         FROM expenses e
         LEFT JOIN branches b ON e.branch_id = b.id
         WHERE DATE(e.date) = ? ${branch_id ? "AND e.branch_id = ?" : ''}`,
         params
      );

      // 7. Savings Transactions
      const [savingsTxns]: any = await pool.query(
        `SELECT st.*, sa.account_no, m.full_name as member_name, sa.account_type, b.branch_name
         FROM savings_transactions st
         JOIN savings_accounts sa ON st.savings_account_id = sa.id
         JOIN members m ON sa.member_id = m.id
         LEFT JOIN branches b ON m.branch_id = b.id
         WHERE DATE(st.date) = ? ${branch_id ? 'AND m.branch_id = ?' : ''}`,
        params
      );

      // 8. Day Book Status & Opening Balance
      const bId = branch_id ? parseInt(branch_id, 10) : null;
      const [cbResult]: any = await pool.query(
        `SELECT * FROM daily_cash_balances WHERE date = ? AND (branch_id = ? OR (branch_id IS NULL AND ? IS NULL))`,
        [date, bId, bId]
      );
      
      let dayBookStatus = cbResult.length > 0 ? cbResult[0] : null;

      let opening_balance = 0;
      if (dayBookStatus) {
        opening_balance = parseFloat(dayBookStatus.opening_balance);
      } else {
        // Get the latest closed record before this date
        const [prevResult]: any = await pool.query(
          `SELECT closing_balance FROM daily_cash_balances WHERE date < ? AND (branch_id = ? OR (branch_id IS NULL AND ? IS NULL)) ORDER BY date DESC LIMIT 1`,
          [date, bId, bId]
        );
        if (prevResult.length > 0) {
          opening_balance = parseFloat(prevResult[0].closing_balance);
        }
      }

      res.json({ date, collections, disbursements, salaries, capital, bankTxns, expenses, savingsTxns, dayBookStatus, opening_balance });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch daybook data' });
    }
  });

  app.post("/api/daybook/close", async (req, res) => {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const { date, branch_id, opening_balance, total_inflow, total_outflow, closing_balance, deposit_amount, bank_id } = req.body;
      const bId = branch_id ? parseInt(branch_id, 10) : null;

      let final_closing = parseFloat(closing_balance);
      let final_outflow = parseFloat(total_outflow);

      if (deposit_amount && bank_id) {
          const depAmt = parseFloat(deposit_amount);
          if (depAmt > 0) {
              await conn.query(
                `INSERT INTO bank_transactions (bank_id, date, type, source_type, source_id, amount, purpose) VALUES (?, ?, 'deposit', 'branch', ?, ?, 'Day Close Cash Deposit')`,
                [bank_id, date, bId, depAmt]
              );
              await conn.query(
                `UPDATE bank_accounts SET current_balance = current_balance + ? WHERE id = ?`,
                [depAmt, bank_id]
              );
              final_outflow += depAmt;
              final_closing -= depAmt;
          }
      }

      await conn.query(
        `INSERT INTO daily_cash_balances (branch_id, date, opening_balance, total_inflow, total_outflow, closing_balance, status)
         VALUES (?, ?, ?, ?, ?, ?, 'closed')
         ON DUPLICATE KEY UPDATE 
         opening_balance = VALUES(opening_balance),
         total_inflow = VALUES(total_inflow),
         total_outflow = VALUES(total_outflow),
         closing_balance = VALUES(closing_balance),
         status = 'closed'`,
         [bId, date, opening_balance, total_inflow, final_outflow, final_closing]
      );
      await conn.commit();
      res.json({ success: true });
    } catch (err: any) {
      await conn.rollback();
      console.error(err);
      res.status(500).json({ error: err.message || 'Failed to close day book' });
    } finally {
      conn.release();
    }
  });

  app.post("/api/daybook/transfer", async (req, res) => {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const { date, branch_id, amount, bank_id, source_type, purpose } = req.body;
      const bId = branch_id ? parseInt(branch_id, 10) : null;

      await conn.query(
        `INSERT INTO bank_transactions (bank_id, date, type, source_type, source_id, amount, purpose) VALUES (?, ?, 'deposit', ?, ?, ?, ?)`,
        [bank_id, date, source_type || 'branch', bId, amount, purpose || 'Cash to Bank Transfer']
      );
      await conn.query(
        `UPDATE bank_accounts SET current_balance = current_balance + ? WHERE id = ?`,
        [amount, bank_id]
      );

      await conn.commit();
      res.json({ success: true });
    } catch (err: any) {
      await conn.rollback();
      console.error(err);
      res.status(500).json({ error: 'Failed to transfer to bank' });
    } finally {
      conn.release();
    }
  });

  app.post("/api/daybook/open", async (req, res) => {
    try {
      const { date, branch_id } = req.body;
      const bId = branch_id ? parseInt(branch_id, 10) : null;
      
      let query, params;
      if (bId) {
         query = `UPDATE daily_cash_balances SET status = 'open' WHERE date = ? AND branch_id = ?`;
         params = [date, bId];
      } else {
         // Re-open for ALL branches on this date if no specific branch is selected
         query = `UPDATE daily_cash_balances SET status = 'open' WHERE date = ?`;
         params = [date];
      }
      const [result]: any = await pool.query(query, params);
      
      if (result.affectedRows === 0) {
        res.status(400).json({ error: 'No matching closed day book found to open.' });
      } else {
        res.json({ success: true, affectedRows: result.affectedRows });
      }
    } catch (err: any) {
      console.error('DAYBOOK OPEN ERROR:', err);
      res.status(500).json({ error: 'Failed to re-open day book: ' + err.message, stack: err.stack });
    }
  });

  app.get("/api/pl", verifyToken, async (req: any, res) => {
    try {
      const { role, branchId: userBranchId } = req.user;
      const startDate = req.query.start_date as string || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
      const endDate = req.query.end_date as string || new Date().toISOString().split('T')[0];
      let branch_id = req.query.branch_id as string;

      if (role === 'branch_manager' || !['superadmin', 'dm', 'am'].includes(role)) {
        branch_id = userBranchId.toString();
      }
      
      const branchFilterLoans = branch_id ? 'AND branch_id = ?' : '';
      const branchFilterColl = branch_id ? 'AND c.branch_id = ?' : '';
      const branchFilterExp = branch_id ? 'AND branch_id = ?' : '';
      const branchFilterSal = branch_id ? 'AND branch_id = ?' : '';
      
      const params = branch_id ? [startDate, endDate, branch_id] : [startDate, endDate];

      // Income 1: Loan Fees
      const [feesResult]: any = await pool.query(
        `SELECT SUM(processing_fee) as processing_fees, SUM(insurance_fee) as insurance_fees 
         FROM loans 
         WHERE DATE(start_date) BETWEEN ? AND ? AND status IN ('active', 'closed') ${branchFilterLoans}`,
        params
      );

      // Income 2: Interest Collected
      const [interestResult]: any = await pool.query(
        `SELECT SUM(c.amount_paid * (l.interest / NULLIF(l.total_repayment, 0))) as interest_collected 
         FROM collections c
         JOIN loans l ON c.loan_id = l.id
         WHERE DATE(c.payment_date) BETWEEN ? AND ? AND c.status != 'rejected' ${branchFilterColl}`,
        params
      );

      // Expenses 1: Salaries
      const [salariesResult]: any = await pool.query(
        `SELECT SUM(net_salary) as salary_expenses 
         FROM salaries 
         WHERE DATE(payment_date) BETWEEN ? AND ? ${branchFilterSal}`,
        params
      );

      // Expenses 2: Other Expenses
      const [expensesResult]: any = await pool.query(
        `SELECT SUM(amount) as other_expenses 
         FROM expenses 
         WHERE DATE(date) BETWEEN ? AND ? ${branchFilterExp}`,
        params
      );

      // Breakdown of expenses
      const [expenseList]: any = await pool.query(
        `SELECT category, SUM(amount) as amount
         FROM expenses
         WHERE DATE(date) BETWEEN ? AND ? ${branchFilterExp}
         GROUP BY category`,
         params
      );

      res.json({
        income: {
          processing_fees: feesResult[0]?.processing_fees || 0,
          insurance_fees: feesResult[0]?.insurance_fees || 0,
          interest_collected: interestResult[0]?.interest_collected || 0,
        },
        expenses: {
          salary_expenses: salariesResult[0]?.salary_expenses || 0,
          other_expenses: expensesResult[0]?.other_expenses || 0,
          expense_breakdown: expenseList
        }
      });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch P&L data' });
    }
  });

  // --- Expenses API ---
  app.get("/api/expenses", verifyToken, async (req: any, res) => {
    try {
      const { role, branchId } = req.user;
      let query = `
        SELECT e.*, b.branch_name 
        FROM expenses e 
        LEFT JOIN branches b ON e.branch_id = b.id 
      `;
      const params: any[] = [];
      
      if (role === 'branch_manager' || !['superadmin', 'dm', 'am'].includes(role)) {
        query += ' WHERE e.branch_id = ?';
        params.push(branchId);
      }
      
      query += ' ORDER BY e.date DESC';
      
      const [results]: any = await pool.query(query, params);
      res.json(results);
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch expenses' });
    }
  });

  app.post("/api/expenses", verifyToken, async (req: any, res) => {
    try {
      const data = req.body;
      const [result]: any = await pool.query(
        `INSERT INTO expenses (branch_id, category, amount, date, description, payment_method, bank_id) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [data.branch_id || null, data.category, data.amount, data.date, data.description || '', data.payment_method, data.bank_id || null]
      );
      res.status(201).json({ id: result.insertId });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: 'Failed to add expense' });
    }
  });

  app.get("/api/debug/db-structure", async (req, res) => {
    try {
      const [tables]: any = await pool.query('SHOW TABLES');
      const dbName = process.env.DB_NAME;
      const structure: any = {};
      
      for (const tableObj of tables) {
        const tableName = tableObj[`Tables_in_${dbName}`];
        const [columns]: any = await pool.query(`SHOW COLUMNS FROM ${tableName}`);
        structure[tableName] = columns;
      }
      
      res.json(structure);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch structure', details: err });
    }
  });

  // Savings & RD Routes
  app.get("/api/savings", verifyToken, async (req, res) => {
    try {
      const [rows]: any = await pool.query(`
        SELECT sa.*, m.full_name as member_name, m.member_code, m.profile_image
        FROM savings_accounts sa
        JOIN members m ON sa.member_id = m.id
        ORDER BY sa.created_at DESC
      `);
      res.json(rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/savings", verifyToken, async (req: any, res) => {
    try {
      const { account_no, member_id, account_type, deposit_frequency, monthly_deposit, duration_months, maturity_amount, maturity_date, interest_rate } = req.body;
      const [result]: any = await pool.query(
        'INSERT INTO savings_accounts (account_no, member_id, account_type, deposit_frequency, monthly_deposit, duration_months, maturity_amount, maturity_date, interest_rate) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [account_no, member_id, account_type, deposit_frequency || 'monthly', monthly_deposit || null, duration_months || null, maturity_amount || null, maturity_date || null, interest_rate || 0]
      );
      res.json({ id: result.insertId, message: "Savings account created" });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/savings/:id", async (req, res) => {
    try {
      const [rows]: any = await pool.query(`
        SELECT sa.*, m.full_name as member_name, m.member_code, m.profile_image, m.guardian_name, m.village, m.mobile_no
        FROM savings_accounts sa
        JOIN members m ON sa.member_id = m.id
        WHERE sa.id = ?
      `, [req.params.id]);
      if (rows.length === 0) return res.status(404).json({ error: "Not found" });
      res.json(rows[0]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/savings/:id/transactions", async (req, res) => {
    try {
      const [rows]: any = await pool.query('SELECT * FROM savings_transactions WHERE savings_account_id = ? ORDER BY date DESC, created_at DESC', [req.params.id]);
      res.json(rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/savings/:id/transactions", async (req, res) => {
    try {
      const savings_account_id = req.params.id;
      const { type, amount, date, remarks } = req.body;
      
      const conn = await pool.getConnection();
      await conn.beginTransaction();
      try {
        await conn.query(
          'INSERT INTO savings_transactions (savings_account_id, type, amount, date, remarks) VALUES (?, ?, ?, ?, ?)',
          [savings_account_id, type, amount, date, remarks || '']
        );
        
        let updateQuery = '';
        if (type === 'deposit' || type === 'interest') {
          updateQuery = 'UPDATE savings_accounts SET balance = balance + ? WHERE id = ?';
        } else if (type === 'withdrawal') {
          updateQuery = 'UPDATE savings_accounts SET balance = balance - ? WHERE id = ?';
        }
        
        if (updateQuery) {
          await conn.query(updateQuery, [amount, savings_account_id]);
        }
        
        // Also update cashbox if necessary. The system has `daily_cash_balances` but usually savings deposits go to MAIN CASH BOX or similar.
        // For now, let's just do it directly. In the old system, saving collections go to collections...
        // Wait, the prompt says "Savings RD niya kaj korbo". Just basic endpoints is fine.
        
        await conn.commit();
        res.json({ message: "Transaction saved" });
      } catch (err: any) {
        await conn.rollback();
        throw err;
      } finally {
        conn.release();
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- Products Endpoints ---
  app.get("/api/products", verifyToken, async (req, res) => {
    try {
      const [rows] = await pool.query('SELECT * FROM products ORDER BY created_at DESC');
      res.json(rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/products", verifyToken, async (req, res) => {
    try {
      const { product_name, product_code, price, stock_quantity, description } = req.body;
      const [result]: any = await pool.query(
        'INSERT INTO products (product_name, product_code, price, stock_quantity, description) VALUES (?, ?, ?, ?, ?)',
        [product_name, product_code || null, price, stock_quantity || 0, description || null]
      );
      res.json({ id: result.insertId, message: "Product created" });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/products/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { product_name, product_code, price, stock_quantity, description } = req.body;
      await pool.query(
        'UPDATE products SET product_name=?, product_code=?, price=?, stock_quantity=?, description=? WHERE id=?',
        [product_name, product_code || null, price, stock_quantity || 0, description || null, id]
      );
      res.json({ message: "Product updated" });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/products/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await pool.query('DELETE FROM products WHERE id=?', [id]);
      res.json({ message: "Product deleted" });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- Sales Endpoints ---
  app.get("/api/sales", verifyToken, async (req, res) => {
    try {
      const [rows] = await pool.query(`
        SELECT s.*, p.product_name, p.product_code, m.full_name as member_name
        FROM sales s
        LEFT JOIN products p ON s.product_id = p.id
        LEFT JOIN members m ON s.member_id = m.id
        ORDER BY s.sale_date DESC, s.created_at DESC
      `);
      res.json(rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/sales", verifyToken, async (req, res) => {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const { sale_date, member_id, product_id, quantity, total_amount, payment_method } = req.body;
      
      // Update stock
      await conn.query('UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?', [quantity, product_id]);
      
      // Insert sale
      const [result]: any = await conn.query(
        'INSERT INTO sales (sale_date, member_id, product_id, quantity, total_amount, payment_method) VALUES (?, ?, ?, ?, ?, ?)',
        [sale_date, member_id || null, product_id, quantity, total_amount, payment_method || null]
      );
      
      await conn.commit();
      res.json({ id: result.insertId, message: "Sale created" });
    } catch (err: any) {
      await conn.rollback();
      res.status(500).json({ error: err.message });
    } finally {
      conn.release();
    }
  });

  app.get("/api/role_permissions", verifyToken, async (req, res) => {
    try {
      const [rows] = await pool.query("SELECT * FROM role_permissions");
      res.json(rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/role_permissions", verifyToken, async (req: any, res) => {
    // Only superadmin can modify role permissions
    if (req.user?.role !== 'superadmin') return res.status(403).json({ error: "Access denied" });
    
    const { role, permissions } = req.body;
    try {
      await pool.query(
        "INSERT INTO role_permissions (role, permissions) VALUES (?, ?) ON DUPLICATE KEY UPDATE permissions = ?",
        [role, JSON.stringify(permissions), JSON.stringify(permissions)]
      );
      res.json({ message: "Permissions updated successfully" });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- Travel Log Endpoints ---
  app.get("/api/travel/stats", verifyToken, async (req: any, res) => {
    try {
      const { userId } = req.user;
      const todayStr = new Date().toISOString().split('T')[0];
      const monthStart = new Date();
      monthStart.setDate(1);
      const monthStartStr = monthStart.toISOString().split('T')[0];

      const [todayStats]: any = await pool.query(
        "SELECT SUM(total_km) as km, SUM(amount) as earnings FROM travel_shifts WHERE user_id = ? AND date = ? AND status = 'completed'",
        [userId, todayStr]
      );

      const [monthStats]: any = await pool.query(
        "SELECT SUM(total_km) as km, SUM(amount) as earnings FROM travel_shifts WHERE user_id = ? AND date >= ? AND status = 'completed'",
        [userId, monthStartStr]
      );

      res.json({
        today: {
          km: todayStats[0].km || 0,
          earnings: todayStats[0].earnings || 0
        },
        month: {
          km: monthStats[0].km || 0,
          earnings: monthStats[0].earnings || 0
        }
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Global Settings
  app.get("/api/settings/:key", verifyToken, async (req, res) => {
    try {
      const [rows]: any = await pool.query('SELECT setting_value FROM global_settings WHERE setting_key = ?', [req.params.key]);
      if (rows.length === 0) return res.status(404).json({ error: 'Setting not found' });
      res.json({ value: rows[0].setting_value });
    } catch (err) {
      res.status(500).json({ error: 'Database error' });
    }
  });

  app.post("/api/settings/:key", verifyToken, async (req: any, res) => {
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    try {
      await pool.query(
        'INSERT INTO global_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?',
        [req.params.key, req.body.value, req.body.value]
      );
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Database error' });
    }
  });

  app.get("/api/travel/vehicles", verifyToken, async (req, res) => {
    try {
      const [rows] = await pool.query('SELECT * FROM travel_vehicle_types WHERE is_active = TRUE ORDER BY name ASC');
      res.json(rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/travel/logs", verifyToken, async (req: any, res) => {
    try {
      const { user_id, status, branch_id } = req.query;
      const { role, userId, branchId } = req.user;
      
      let query = `
        SELECT tl.*, u.name as user_name, u.phone as user_phone, vt.name as vehicle_name, b.branch_name
        FROM travel_logs tl
        JOIN users u ON tl.user_id = u.id
        LEFT JOIN travel_vehicle_types vt ON tl.vehicle_type_id = vt.id
        LEFT JOIN branches b ON tl.branch_id = b.id
        WHERE 1=1
      `;
      const params: any[] = [];

      // Security filters
      if (role === 'branch_manager') {
        query += " AND (tl.branch_id = ? OR tl.user_id = ?)";
        params.push(branchId, userId);
      } else if (!['superadmin', 'am', 'dm', 'manager'].includes(role)) {
        query += " AND tl.user_id = ?";
        params.push(userId);
      }

      // Optional property filters
      if (user_id) {
        query += " AND tl.user_id = ?";
        params.push(user_id);
      }
      if (status) {
        query += " AND tl.status = ?";
        params.push(status);
      }
      if (branch_id) {
        query += " AND tl.branch_id = ?";
        params.push(branch_id);
      }

      query += " ORDER BY tl.date DESC, tl.created_at DESC";
      const [rows] = await pool.query(query, params);
      res.json(rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/travel/logs", verifyToken, async (req: any, res) => {
    try {
      const { date, source, destination, distance_km, purpose, vehicle_type_id, amount, rate_per_km_used, image_url } = req.body;
      const { userId, branchId } = req.user;

      const [result]: any = await pool.query(
        "INSERT INTO travel_logs (user_id, branch_id, date, source, destination, distance_km, purpose, vehicle_type_id, amount, rate_per_km_used, image_url, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')",
        [userId, branchId || null, date, source, destination, distance_km, purpose || null, vehicle_type_id || null, amount || 0, rate_per_km_used || 0, image_url || null]
      );
      res.json({ id: result.insertId, message: "Travel log submitted successfully" });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/travel/logs/:id/status", verifyToken, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { status, remarks } = req.body;
      const { userId, role } = req.user;

      // Only managers/admins can approve
      if (!['superadmin', 'am', 'dm', 'branch_manager', 'manager'].includes(role)) {
        return res.status(403).json({ error: "Unauthorized to approve travel logs" });
      }

      await pool.query(
        "UPDATE travel_logs SET status = ?, remarks = ?, approved_by = ?, approved_at = NOW() WHERE id = ?",
        [status, remarks || null, userId, id]
      );
      res.json({ message: `Travel log marked as ${status}` });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/travel/logs/:id", verifyToken, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { userId, role } = req.user;

      // Can only delete own pending logs or if admin
      const [rows]: any = await pool.query("SELECT * FROM travel_logs WHERE id = ?", [id]);
      if (rows.length === 0) return res.status(404).json({ error: "Log not found" });

      const log = rows[0];
      if (role !== 'superadmin' && (log.user_id !== userId || log.status !== 'pending')) {
        return res.status(403).json({ error: "Cannot delete this log" });
      }

      await pool.query("DELETE FROM travel_logs WHERE id = ?", [id]);
      res.json({ message: "Travel log deleted" });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- New Travel Shift & Visit Endpoints (Spotway Style) ---
  app.get("/api/travel/shifts/active", verifyToken, async (req: any, res) => {
    try {
      const { userId } = req.user;
      const [rows]: any = await pool.query(
        "SELECT * FROM travel_shifts WHERE user_id = ? AND status = 'active' LIMIT 1",
        [userId]
      );
      res.json(rows[0] || null);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/travel/shifts/start", verifyToken, async (req: any, res) => {
    try {
      const { userId, branchId } = req.user;
      const { start_odometer, start_image, date, latitude, longitude } = req.body;

      // Check for existing active shift
      const [active]: any = await pool.query("SELECT id FROM travel_shifts WHERE user_id = ? AND status = 'active'", [userId]);
      if (active.length > 0) return res.status(400).json({ error: "Shift already active" });

      const [result]: any = await pool.query(
        "INSERT INTO travel_shifts (user_id, branch_id, date, start_time, start_odometer, start_image, start_lat, start_lng, status) VALUES (?, ?, ?, NOW(), ?, ?, ?, ?, 'active')",
        [userId, branchId || null, date, start_odometer, start_image, latitude || null, longitude || null]
      );
      res.json({ id: result.insertId, message: "Shift started successfully" });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/travel/shifts/:id/end", verifyToken, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { userId } = req.user;
      const { end_odometer, end_image, rate_per_km, remarks, latitude, longitude, gps_km } = req.body;

      const [shifts]: any = await pool.query("SELECT * FROM travel_shifts WHERE id = ? AND user_id = ?", [id, userId]);
      if (shifts.length === 0) return res.status(404).json({ error: "Shift not found" });

      const shift = shifts[0];
      const distance = parseFloat(end_odometer) - parseFloat(shift.start_odometer);
      const amount = distance * parseFloat(rate_per_km || 0);

      await pool.query(
        "UPDATE travel_shifts SET end_time = NOW(), end_odometer = ?, end_image = ?, total_km = ?, amount = ?, rate_per_km = ?, remarks = ?, end_lat = ?, end_lng = ?, gps_km = ?, status = 'completed' WHERE id = ?",
        [end_odometer, end_image, distance > 0 ? distance : 0, amount > 0 ? amount : 0, rate_per_km || 0, remarks || null, latitude || null, longitude || null, gps_km || 0, id]
      );

      res.json({ message: "Shift ended and submitted for approval" });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/travel/visits", verifyToken, async (req: any, res) => {
    try {
      const { shift_id, location_name, latitude, longitude, purpose, image_url } = req.body;
      
      const [result]: any = await pool.query(
        "INSERT INTO travel_visits (shift_id, location_name, latitude, longitude, purpose, image_url) VALUES (?, ?, ?, ?, ?, ?)",
        [shift_id, location_name, latitude, longitude, purpose || null, image_url || null]
      );
      res.json({ id: result.insertId, message: "Visit logged successfully" });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/travel/shifts", verifyToken, async (req: any, res) => {
    try {
      const { status, user_id, branch_id } = req.query;
      const { role, userId, branchId } = req.user;

      let query = `
        SELECT ts.*, u.name as user_name, u.phone as user_phone, b.branch_name
        FROM travel_shifts ts
        JOIN users u ON ts.user_id = u.id
        LEFT JOIN branches b ON ts.branch_id = b.id
        WHERE 1=1
      `;
      const params: any[] = [];

      if (role === 'branch_manager') {
        query += " AND (ts.branch_id = ? OR ts.user_id = ?)";
        params.push(branchId, userId);
      } else if (!['superadmin', 'am', 'dm', 'manager'].includes(role)) {
        query += " AND ts.user_id = ?";
        params.push(userId);
      }

      if (status) {
        query += " AND ts.status = ?";
        params.push(status);
      }
      if (user_id) {
        query += " AND ts.user_id = ?";
        params.push(user_id);
      }
      if (branch_id) {
        query += " AND ts.branch_id = ?";
        params.push(branch_id);
      }

      query += " ORDER BY ts.date DESC, ts.start_time DESC";
      const [rows] = await pool.query(query, params);
      res.json(rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/travel/shifts/:id/visits", verifyToken, async (req, res) => {
    try {
      const { id } = req.params;
      const [rows] = await pool.query("SELECT * FROM travel_visits WHERE shift_id = ? ORDER BY time ASC", [id]);
      res.json(rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/travel/shifts/:id/status", verifyToken, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { status, remarks } = req.body;
      const { userId, role } = req.user;

      if (!['superadmin', 'am', 'dm', 'branch_manager', 'manager'].includes(role)) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      await pool.query(
        "UPDATE travel_shifts SET status = ?, remarks = IFNULL(?, remarks) WHERE id = ?",
        [status, remarks, id]
      );
      res.json({ message: `Shift marked as ${status}` });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/travel/summary", verifyToken, async (req: any, res) => {
    try {
      const { month, year, branch_id } = req.query;
      const targetMonth = month ? Number(month) : new Date().getMonth() + 1;
      const targetYear = year ? Number(year) : new Date().getFullYear();

      const [rows] = await pool.query(`
        SELECT 
          u.id as user_id, 
          u.name as user_name, 
          u.phone,
          COALESCE(SUM(ts.distance_km), 0) as shift_km,
          COALESCE(SUM(ts.amount), 0) as shift_amount,
          COALESCE(SUM(tl.distance_km), 0) as log_km,
          COALESCE(SUM(tl.amount), 0) as log_amount
        FROM users u
        LEFT JOIN travel_shifts ts ON ts.user_id = u.id AND ts.status IN ('completed', 'approved') AND MONTH(ts.start_time) = ? AND YEAR(ts.start_time) = ?
        LEFT JOIN travel_logs tl ON tl.user_id = u.id AND tl.status = 'approved' AND MONTH(tl.date) = ? AND YEAR(tl.date) = ?
        WHERE (? IS NULL OR u.branch_id = ?)
        GROUP BY u.id, u.name, u.phone
        HAVING shift_km > 0 OR log_km > 0
        ORDER BY user_name ASC
      `, [targetMonth, targetYear, targetMonth, targetYear, branch_id || null, branch_id || null]);
      
      res.json(rows);
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  // --- Travel V2 Endpoints ---
  app.get("/api/travel_v2/fuel-rates", verifyToken, async (req, res) => {
    try {
      const [rows]: any = await pool.query('SELECT * FROM fuel_rate_settings ORDER BY id DESC LIMIT 1');
      res.json(rows[0] || { rate_per_km: 3 }); // Default rate
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.post("/api/travel_v2/fuel-rates", verifyToken, async (req: any, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: "Only admin can set rates" });
    try {
      const { rate_per_km } = req.body;
      await pool.query('INSERT INTO fuel_rate_settings (rate_per_km, effective_from) VALUES (?, ?)', [rate_per_km, new Date()]);
      res.json({ message: "Rate updated" });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.get("/api/travel_v2/sessions/active", verifyToken, async (req: any, res) => {
    try {
      const [rows]: any = await pool.query('SELECT * FROM travel_sessions_v2 WHERE user_id = ? AND status = "draft" AND travel_date = CURDATE() ORDER BY id DESC LIMIT 1', [req.user.userId]);
      if (!rows.length) return res.json(null);
      const session = rows[0];
      const [entries]: any = await pool.query('SELECT * FROM travel_entries_v2 WHERE session_id = ?', [session.id]);
      session.entries = entries;
      res.json(session);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.post("/api/travel_v2/sessions/start", verifyToken, async (req: any, res) => {
    try {
      const { start_meter, start_meter_image, start_lat, start_lng } = req.body;
      const [existing]: any = await pool.query('SELECT id FROM travel_sessions_v2 WHERE user_id = ? AND travel_date = CURDATE() AND status != "rejected"', [req.user.userId]);
      if (existing.length > 0) return res.status(400).json({ error: "Session already exists for today" });

      const [result]: any = await pool.query(
        'INSERT INTO travel_sessions_v2 (user_id, branch_id, travel_date, start_meter, start_meter_image, start_lat, start_lng) VALUES (?, ?, CURDATE(), ?, ?, ?, ?)',
        [req.user.userId, req.user.branchId, start_meter, start_meter_image, start_lat, start_lng]
      );
      res.json({ id: result.insertId });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.post("/api/travel_v2/sessions/:id/entries", verifyToken, async (req: any, res) => {
    try {
      const { from_location, to_location, purpose, estimated_km } = req.body;
      await pool.query(
        'INSERT INTO travel_entries_v2 (session_id, from_location, to_location, purpose, estimated_km) VALUES (?, ?, ?, ?, ?)',
        [req.params.id, from_location, to_location, purpose, estimated_km]
      );
      res.json({ message: "Entry added" });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.put("/api/travel_v2/sessions/:id/end", verifyToken, async (req: any, res) => {
    try {
      const { end_meter, end_meter_image, end_lat, end_lng } = req.body;
      const [sessions]: any = await pool.query('SELECT * FROM travel_sessions_v2 WHERE id = ?', [req.params.id]);
      if (!sessions.length) return res.status(404).json({ error: "Not found" });
      const session = sessions[0];
      
      const total_km = end_meter - session.start_meter;
      if (total_km < 0) return res.status(400).json({ error: "End meter cannot be less than start meter" });

      const [rates]: any = await pool.query('SELECT rate_per_km FROM fuel_rate_settings ORDER BY id DESC LIMIT 1');
      const rate = rates.length ? rates[0].rate_per_km : 3;
      const total_amount = total_km * rate;

      await pool.query(
        'UPDATE travel_sessions_v2 SET end_meter = ?, end_meter_image = ?, end_lat = ?, end_lng = ?, total_km = ?, rate_per_km = ?, total_amount = ?, status = "pending" WHERE id = ?',
        [end_meter, end_meter_image, end_lat, end_lng, total_km, rate, total_amount, req.params.id]
      );
      res.json({ message: "Session submitted" });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.get("/api/travel_v2/sessions", verifyToken, async (req: any, res) => {
    try {
      const { status } = req.query;
      let query = `
        SELECT ts.*, u.name as user_name, b.branch_name as branch_name 
        FROM travel_sessions_v2 ts 
        JOIN users u ON ts.user_id = u.id 
        LEFT JOIN branches b ON ts.branch_id = b.id 
        WHERE ts.status != "draft"
      `;
      const params: any[] = [];
      if (status) {
        query += ' AND ts.status = ?';
        params.push(status);
      }
      query += ' ORDER BY ts.created_at DESC';

      const [sessions]: any = await pool.query(query, params);
      for (const s of sessions) {
        const [entries] = await pool.query('SELECT * FROM travel_entries_v2 WHERE session_id = ?', [s.id]);
        s.entries = entries;
      }
      res.json(sessions);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.put("/api/travel_v2/sessions/:id/status", verifyToken, async (req: any, res) => {
    try {
      const { status, total_km, total_amount, admin_remarks } = req.body;
      await pool.query(
        'UPDATE travel_sessions_v2 SET status = ?, total_km = ?, total_amount = ?, admin_remarks = ? WHERE id = ?',
        [status, total_km, total_amount, admin_remarks, req.params.id]
      );
      res.json({ message: "Updated" });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.get("/api/travel_v2/stats/my", verifyToken, async (req: any, res) => {
    try {
      const [today]: any = await pool.query('SELECT COALESCE(SUM(total_km), 0) as km, COALESCE(SUM(total_amount), 0) as amount FROM travel_sessions_v2 WHERE user_id = ? AND travel_date = CURDATE()', [req.user.userId]);
      const [pending]: any = await pool.query('SELECT COUNT(*) as count FROM travel_sessions_v2 WHERE user_id = ? AND status = "pending"', [req.user.userId]);
      const [monthly]: any = await pool.query('SELECT COALESCE(SUM(total_amount), 0) as amount FROM travel_sessions_v2 WHERE user_id = ? AND status = "approved" AND MONTH(travel_date) = MONTH(CURDATE()) AND YEAR(travel_date) = YEAR(CURDATE())', [req.user.userId]);
      
      res.json({
        today_km: today[0].km,
        today_amount: today[0].amount,
        pending_claims: pending[0].count,
        monthly_amount: monthly[0].amount
      });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.get("/api/travel_v2/sessions/my", verifyToken, async (req: any, res) => {
    try {
      const [sessions]: any = await pool.query('SELECT * FROM travel_sessions_v2 WHERE user_id = ? ORDER BY travel_date DESC LIMIT 20', [req.user.userId]);
      for (const s of sessions) {
        const [entries] = await pool.query('SELECT * FROM travel_entries_v2 WHERE session_id = ?', [s.id]);
        s.entries = entries;
      }
      res.json(sessions);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.get("/api/test-db", async (req, res) => {
    try {
      const [rows]: any = await pool.query(`
        SELECT l.*, m.full_name as member_name, m.member_code as member_code, m.profile_image, m.mobile_no as member_mobile, m.group_id, g.group_name, g.meeting_day, s.scheme_name, s.interest_rate, b.branch_name, u.name as staff_name,
        (SELECT COALESCE(SUM(amount_paid), 0) FROM collections WHERE loan_id = l.id AND status != 'rejected') as total_paid,
        (SELECT COUNT(id) FROM collections WHERE loan_id = l.id AND status != 'rejected' AND amount_paid > 0) as paid_emi_count,
        (SELECT u2.name FROM collections c JOIN users u2 ON c.collected_by = u2.id WHERE c.loan_id = l.id AND c.is_pre_close = 1 LIMIT 1) as closed_by_name
        FROM loans l
        LEFT JOIN members m ON l.customer_id = m.id
        LEFT JOIN groups g ON m.group_id = g.id
        LEFT JOIN users u ON g.collector_id = u.id
        LEFT JOIN schemes s ON l.scheme_id = s.id
        LEFT JOIN branches b ON l.branch_id = b.id
        ORDER BY l.created_at DESC
      `);
      res.json({ success: true, count: rows.length });
    } catch (e: any) {
      res.status(500).json({ error: e.message, stack: e.stack });
    }
  });

  // Vite middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
