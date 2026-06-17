--
-- PostgreSQL database dump
--

\restrict Bd8J4zEcze6biVBPP7pKOYpnrwHdwV0XsSChXoCCMJwhQ9VN168aib31dflnAFl

-- Dumped from database version 16.14
-- Dumped by pg_dump version 16.14

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: access_requests_status_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.access_requests_status_enum AS ENUM (
    'PENDING',
    'APPROVED',
    'DENIED'
);


ALTER TYPE public.access_requests_status_enum OWNER TO postgres;

--
-- Name: approval_requests_moduletype_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.approval_requests_moduletype_enum AS ENUM (
    'WASTE',
    'EXPENSE',
    'CLOSING',
    'STOCK_UPDATE',
    'STOCK_IN',
    'DATA_EDIT',
    'TABLE_ACCESS',
    'PENALTY'
);


ALTER TYPE public.approval_requests_moduletype_enum OWNER TO postgres;

--
-- Name: approval_requests_status_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.approval_requests_status_enum AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED'
);


ALTER TYPE public.approval_requests_status_enum OWNER TO postgres;

--
-- Name: asset_categories_assettype_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.asset_categories_assettype_enum AS ENUM (
    'BILLIARD',
    'PLAYSTATION',
    'LOCKER'
);


ALTER TYPE public.asset_categories_assettype_enum OWNER TO postgres;

--
-- Name: attendances_status_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.attendances_status_enum AS ENUM (
    'PRESENT',
    'LATE',
    'OVERTIME',
    'ABSENT',
    'PENDING',
    'SAKIT',
    'IZIN',
    'ALPHA'
);


ALTER TYPE public.attendances_status_enum OWNER TO postgres;

--
-- Name: battle_plans_status_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.battle_plans_status_enum AS ENUM (
    'DRAFT',
    'PUBLISHED'
);


ALTER TYPE public.battle_plans_status_enum OWNER TO postgres;

--
-- Name: billiard_packages_type_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.billiard_packages_type_enum AS ENUM (
    'hourly',
    'fixed',
    'DURATION',
    'PLAYTIME'
);


ALTER TYPE public.billiard_packages_type_enum OWNER TO postgres;

--
-- Name: cafe_tables_status_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.cafe_tables_status_enum AS ENUM (
    'available',
    'occupied',
    'reserved'
);


ALTER TYPE public.cafe_tables_status_enum OWNER TO postgres;

--
-- Name: cashflow_type_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.cashflow_type_enum AS ENUM (
    'in',
    'out'
);


ALTER TYPE public.cashflow_type_enum OWNER TO postgres;

--
-- Name: categories_type_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.categories_type_enum AS ENUM (
    'MENU',
    'INGREDIENT',
    'BOTH'
);


ALTER TYPE public.categories_type_enum OWNER TO postgres;

--
-- Name: expenses_category_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.expenses_category_enum AS ENUM (
    'maintenance',
    'staff',
    'utility',
    'inventory_stock',
    'marketing',
    'other'
);


ALTER TYPE public.expenses_category_enum OWNER TO postgres;

--
-- Name: expenses_status_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.expenses_status_enum AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED'
);


ALTER TYPE public.expenses_status_enum OWNER TO postgres;

--
-- Name: ingredient_batches_status_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.ingredient_batches_status_enum AS ENUM (
    'AVAILABLE',
    'DEPLETED',
    'SCRAP'
);


ALTER TYPE public.ingredient_batches_status_enum OWNER TO postgres;

--
-- Name: inventory_waste_status_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.inventory_waste_status_enum AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED'
);


ALTER TYPE public.inventory_waste_status_enum OWNER TO postgres;

--
-- Name: order_items_status_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.order_items_status_enum AS ENUM (
    'QUEUED',
    'PROCESSING',
    'DONE',
    'CANCELLED',
    'CANCEL_REQUESTED',
    'CANCEL_REJECTED'
);


ALTER TYPE public.order_items_status_enum OWNER TO postgres;

--
-- Name: point_ledgers_type_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.point_ledgers_type_enum AS ENUM (
    'EARN',
    'REDEEM',
    'GAME_PLAY',
    'GAME_WIN',
    'ADJUSTMENT',
    'EXPIRY',
    'MISSION_REWARD',
    'REFERRAL',
    'TOPUP_BONUS'
);


ALTER TYPE public.point_ledgers_type_enum OWNER TO postgres;

--
-- Name: point_rewards_category_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.point_rewards_category_enum AS ENUM (
    'BILLIARD',
    'CAFE',
    'MERCHANDISE'
);


ALTER TYPE public.point_rewards_category_enum OWNER TO postgres;

--
-- Name: printers_connectiontype_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.printers_connectiontype_enum AS ENUM (
    'IP',
    'SERIAL_COM'
);


ALTER TYPE public.printers_connectiontype_enum OWNER TO postgres;

--
-- Name: printers_type_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.printers_type_enum AS ENUM (
    'CASHIER',
    'KITCHEN',
    'BARTENDER'
);


ALTER TYPE public.printers_type_enum OWNER TO postgres;

--
-- Name: promos_type_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.promos_type_enum AS ENUM (
    'BUNDLE',
    'PACKAGE',
    'QUANTITY_DISCOUNT',
    'TIME_BASED'
);


ALTER TYPE public.promos_type_enum OWNER TO postgres;

--
-- Name: sessions_sessiontype_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.sessions_sessiontype_enum AS ENUM (
    'prepaid',
    'open'
);


ALTER TYPE public.sessions_sessiontype_enum OWNER TO postgres;

--
-- Name: shifts_approvalstatus_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.shifts_approvalstatus_enum AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED'
);


ALTER TYPE public.shifts_approvalstatus_enum OWNER TO postgres;

--
-- Name: shifts_status_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.shifts_status_enum AS ENUM (
    'OPEN',
    'CLOSED'
);


ALTER TYPE public.shifts_status_enum OWNER TO postgres;

--
-- Name: stock_ins_paymentstatus_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.stock_ins_paymentstatus_enum AS ENUM (
    'PAID',
    'UNPAID',
    'PARTIAL'
);


ALTER TYPE public.stock_ins_paymentstatus_enum OWNER TO postgres;

--
-- Name: tables_hardwaretype_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.tables_hardwaretype_enum AS ENUM (
    'PCF8575',
    'MOC3062',
    'ESPNOW_NODE'
);


ALTER TYPE public.tables_hardwaretype_enum OWNER TO postgres;

--
-- Name: tables_sessiontype_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.tables_sessiontype_enum AS ENUM (
    'prepaid',
    'open'
);


ALTER TYPE public.tables_sessiontype_enum OWNER TO postgres;

--
-- Name: tables_stationtype_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.tables_stationtype_enum AS ENUM (
    'BILLIARD',
    'PLAYSTATION'
);


ALTER TYPE public.tables_stationtype_enum OWNER TO postgres;

--
-- Name: tables_status_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.tables_status_enum AS ENUM (
    'available',
    'in_use',
    'warning',
    'waiting_payment',
    'maintenance'
);


ALTER TYPE public.tables_status_enum OWNER TO postgres;

--
-- Name: transactions_status_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.transactions_status_enum AS ENUM (
    'UNPAID',
    'PAID',
    'PARTIAL',
    'DEBT',
    'CANCELLED'
);


ALTER TYPE public.transactions_status_enum OWNER TO postgres;

--
-- Name: transactions_type_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.transactions_type_enum AS ENUM (
    'BILLIARD',
    'CAFE',
    'TOPUP'
);


ALTER TYPE public.transactions_type_enum OWNER TO postgres;

--
-- Name: users_securitymode_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.users_securitymode_enum AS ENUM (
    'RFID_ONLY',
    'FINGERPRINT_ONLY',
    'HYBRID',
    'DUAL'
);


ALTER TYPE public.users_securitymode_enum OWNER TO postgres;

--
-- Name: users_status_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.users_status_enum AS ENUM (
    'ACTIVE',
    'AWAY',
    'BANNED',
    'OFFLINE'
);


ALTER TYPE public.users_status_enum OWNER TO postgres;

--
-- Name: violations_type_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.violations_type_enum AS ENUM (
    'IDLE_TIMEOUT',
    'LATE_LOGIN',
    'MANUAL_PENALTY'
);


ALTER TYPE public.violations_type_enum OWNER TO postgres;

--
-- Name: vouchers_type_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.vouchers_type_enum AS ENUM (
    'DISCOUNT_PERCENT',
    'DISCOUNT_FIXED',
    'FREE_BILLIARD_MINUTES',
    'FREE_ITEM',
    'SPECIAL_PRICE',
    'BUY_X_GET_Y_BILLIARD',
    'BUNDLE_DEAL',
    'CASHBACK_BALANCE'
);


ALTER TYPE public.vouchers_type_enum OWNER TO postgres;

--
-- Name: waiting_lists_status_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.waiting_lists_status_enum AS ENUM (
    'PENDING',
    'CHECKED_IN',
    'CANCELLED'
);


ALTER TYPE public.waiting_lists_status_enum OWNER TO postgres;

--
-- Name: waiting_lists_type_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.waiting_lists_type_enum AS ENUM (
    'BILLIARD',
    'CAFE'
);


ALTER TYPE public.waiting_lists_type_enum OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: access_requests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.access_requests (
    id integer NOT NULL,
    "userId" integer NOT NULL,
    username character varying NOT NULL,
    "employeeName" character varying NOT NULL,
    "roleName" character varying NOT NULL,
    status public.access_requests_status_enum DEFAULT 'PENDING'::public.access_requests_status_enum NOT NULL,
    "isOutOfShift" boolean DEFAULT false NOT NULL,
    "shiftName" character varying,
    "shiftTimeRange" character varying,
    "approvedBy" integer,
    "approvedByName" character varying,
    "socketId" character varying,
    note text,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.access_requests OWNER TO postgres;

--
-- Name: access_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.access_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.access_requests_id_seq OWNER TO postgres;

--
-- Name: access_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.access_requests_id_seq OWNED BY public.access_requests.id;


--
-- Name: ai_upsell_prompts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ai_upsell_prompts (
    id integer NOT NULL,
    "businessDayId" integer NOT NULL,
    "menuItemId" integer,
    "packageId" integer,
    "promoId" integer,
    "tableId" integer,
    "tableName" character varying,
    "isConverted" boolean DEFAULT false NOT NULL,
    "isAcknowledged" boolean DEFAULT false NOT NULL,
    "convertedAt" timestamp without time zone,
    "transactionId" integer,
    "convertedByUserId" integer,
    "convertedByUserName" character varying,
    message text,
    "isManual" boolean DEFAULT false NOT NULL,
    "ackCount" integer DEFAULT 0 NOT NULL,
    "conversionValue" numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.ai_upsell_prompts OWNER TO postgres;

--
-- Name: ai_upsell_prompts_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.ai_upsell_prompts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.ai_upsell_prompts_id_seq OWNER TO postgres;

--
-- Name: ai_upsell_prompts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.ai_upsell_prompts_id_seq OWNED BY public.ai_upsell_prompts.id;


--
-- Name: approval_history; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.approval_history (
    id integer NOT NULL,
    "approvalRequestId" integer NOT NULL,
    "userId" integer NOT NULL,
    level integer NOT NULL,
    action character varying NOT NULL,
    note text,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.approval_history OWNER TO postgres;

--
-- Name: approval_history_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.approval_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.approval_history_id_seq OWNER TO postgres;

--
-- Name: approval_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.approval_history_id_seq OWNED BY public.approval_history.id;


--
-- Name: approval_requests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.approval_requests (
    id integer NOT NULL,
    "moduleType" public.approval_requests_moduletype_enum NOT NULL,
    "referenceId" integer NOT NULL,
    "requiredLevels" json NOT NULL,
    "currentLevelIndex" integer DEFAULT 0 NOT NULL,
    status public.approval_requests_status_enum DEFAULT 'PENDING'::public.approval_requests_status_enum NOT NULL,
    metadata text,
    "requestedByUserId" integer NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.approval_requests OWNER TO postgres;

--
-- Name: approval_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.approval_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.approval_requests_id_seq OWNER TO postgres;

--
-- Name: approval_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.approval_requests_id_seq OWNED BY public.approval_requests.id;


--
-- Name: asset_categories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.asset_categories (
    id integer NOT NULL,
    name character varying NOT NULL,
    description character varying,
    "assetType" public.asset_categories_assettype_enum DEFAULT 'BILLIARD'::public.asset_categories_assettype_enum NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.asset_categories OWNER TO postgres;

--
-- Name: asset_categories_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.asset_categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.asset_categories_id_seq OWNER TO postgres;

--
-- Name: asset_categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.asset_categories_id_seq OWNED BY public.asset_categories.id;


--
-- Name: attendances; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.attendances (
    id integer NOT NULL,
    "userId" integer NOT NULL,
    date date NOT NULL,
    "checkInTime" timestamp without time zone,
    "checkOutTime" timestamp without time zone,
    "workDurationMinutes" integer,
    status public.attendances_status_enum DEFAULT 'PRESENT'::public.attendances_status_enum NOT NULL,
    "isApproved" boolean DEFAULT false NOT NULL,
    "approvedBy" character varying,
    "approvedAt" timestamp without time zone,
    "overtimeMinutes" integer DEFAULT 0 NOT NULL,
    "isManual" boolean DEFAULT false NOT NULL,
    "shiftName" character varying,
    note text,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    "payrollReleaseId" integer
);


ALTER TABLE public.attendances OWNER TO postgres;

--
-- Name: attendances_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.attendances_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.attendances_id_seq OWNER TO postgres;

--
-- Name: attendances_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.attendances_id_seq OWNED BY public.attendances.id;


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.audit_logs (
    id integer NOT NULL,
    action character varying NOT NULL,
    "user" character varying NOT NULL,
    details text,
    "tableId" integer,
    "invoiceNumber" character varying,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.audit_logs OWNER TO postgres;

--
-- Name: audit_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.audit_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.audit_logs_id_seq OWNER TO postgres;

--
-- Name: audit_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.audit_logs_id_seq OWNED BY public.audit_logs.id;


--
-- Name: battle_plan_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.battle_plan_items (
    id integer NOT NULL,
    "battlePlanId" integer NOT NULL,
    "menuItemId" integer,
    "packageId" integer,
    "promoId" integer,
    "targetQuantity" integer NOT NULL,
    "soldQuantity" integer DEFAULT 0 NOT NULL,
    "aiLabel" character varying,
    "isAutoBroadcastEnabled" boolean DEFAULT false NOT NULL
);


ALTER TABLE public.battle_plan_items OWNER TO postgres;

--
-- Name: battle_plan_items_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.battle_plan_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.battle_plan_items_id_seq OWNER TO postgres;

--
-- Name: battle_plan_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.battle_plan_items_id_seq OWNED BY public.battle_plan_items.id;


--
-- Name: battle_plans; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.battle_plans (
    id integer NOT NULL,
    "businessDayId" integer NOT NULL,
    "targetRevenue" numeric(12,2) NOT NULL,
    "predictedRevenue" numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    status public.battle_plans_status_enum DEFAULT 'DRAFT'::public.battle_plans_status_enum NOT NULL,
    "aiStrategyBrief" text,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.battle_plans OWNER TO postgres;

--
-- Name: battle_plans_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.battle_plans_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.battle_plans_id_seq OWNER TO postgres;

--
-- Name: battle_plans_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.battle_plans_id_seq OWNED BY public.battle_plans.id;


--
-- Name: billiard_packages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.billiard_packages (
    id integer NOT NULL,
    name character varying NOT NULL,
    "categoryId" integer,
    type public.billiard_packages_type_enum DEFAULT 'hourly'::public.billiard_packages_type_enum NOT NULL,
    "durationMinutes" integer,
    price numeric(12,2) NOT NULL,
    "minutePrice" numeric(12,2),
    "timeSlots" json,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    "validDays" text
);


ALTER TABLE public.billiard_packages OWNER TO postgres;

--
-- Name: billiard_packages_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.billiard_packages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.billiard_packages_id_seq OWNER TO postgres;

--
-- Name: billiard_packages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.billiard_packages_id_seq OWNED BY public.billiard_packages.id;


--
-- Name: business_closures; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.business_closures (
    id integer NOT NULL,
    "startDate" date NOT NULL,
    "endDate" date NOT NULL,
    reason character varying NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.business_closures OWNER TO postgres;

--
-- Name: business_closures_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.business_closures_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.business_closures_id_seq OWNER TO postgres;

--
-- Name: business_closures_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.business_closures_id_seq OWNED BY public.business_closures.id;


--
-- Name: business_days; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.business_days (
    id integer NOT NULL,
    date date NOT NULL,
    "startTime" timestamp without time zone DEFAULT now() NOT NULL,
    "endTime" timestamp without time zone,
    "isClosed" boolean DEFAULT false NOT NULL,
    "totalRevenue" numeric(15,2) DEFAULT '0'::numeric NOT NULL,
    "totalExpenses" numeric(15,2) DEFAULT '0'::numeric NOT NULL,
    "totalTopUp" numeric(15,2) DEFAULT '0'::numeric NOT NULL,
    "isAudited" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.business_days OWNER TO postgres;

--
-- Name: business_days_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.business_days_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.business_days_id_seq OWNER TO postgres;

--
-- Name: business_days_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.business_days_id_seq OWNED BY public.business_days.id;


--
-- Name: cafe_tables; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.cafe_tables (
    id integer NOT NULL,
    "tableName" character varying NOT NULL,
    capacity integer DEFAULT 4 NOT NULL,
    status public.cafe_tables_status_enum DEFAULT 'available'::public.cafe_tables_status_enum NOT NULL,
    "currentTransactionId" integer,
    "currentCustomer" character varying(255),
    "isBooked" boolean DEFAULT false NOT NULL,
    "bookedByWaitingId" integer,
    "bookedByName" character varying,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    "deletedAt" timestamp without time zone
);


ALTER TABLE public.cafe_tables OWNER TO postgres;

--
-- Name: cafe_tables_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.cafe_tables_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.cafe_tables_id_seq OWNER TO postgres;

--
-- Name: cafe_tables_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.cafe_tables_id_seq OWNED BY public.cafe_tables.id;


--
-- Name: cashflow; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.cashflow (
    id integer NOT NULL,
    amount numeric(12,2) NOT NULL,
    type public.cashflow_type_enum NOT NULL,
    source character varying NOT NULL,
    "referenceId" character varying,
    description text,
    "paymentMethod" character varying,
    "timestamp" timestamp without time zone DEFAULT now() NOT NULL,
    "balanceAfter" numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    "businessDayId" integer,
    "shiftId" integer
);


ALTER TABLE public.cashflow OWNER TO postgres;

--
-- Name: cashflow_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.cashflow_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.cashflow_id_seq OWNER TO postgres;

--
-- Name: cashflow_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.cashflow_id_seq OWNED BY public.cashflow.id;


--
-- Name: cashflow_archive; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.cashflow_archive (
    id integer DEFAULT nextval('public.cashflow_id_seq'::regclass) NOT NULL,
    amount numeric(12,2) NOT NULL,
    type public.cashflow_type_enum NOT NULL,
    source character varying NOT NULL,
    "referenceId" character varying,
    description text,
    "paymentMethod" character varying,
    "timestamp" timestamp without time zone DEFAULT now() NOT NULL,
    "balanceAfter" numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    "businessDayId" integer,
    "shiftId" integer
);


ALTER TABLE public.cashflow_archive OWNER TO postgres;

--
-- Name: categories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.categories (
    id integer NOT NULL,
    name character varying NOT NULL,
    type public.categories_type_enum DEFAULT 'MENU'::public.categories_type_enum NOT NULL,
    "productionTarget" character varying(50) DEFAULT 'KDS'::character varying NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.categories OWNER TO postgres;

--
-- Name: categories_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.categories_id_seq OWNER TO postgres;

--
-- Name: categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.categories_id_seq OWNED BY public.categories.id;


--
-- Name: chat_messages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.chat_messages (
    id integer NOT NULL,
    "senderId" integer,
    "receiverId" integer,
    message text NOT NULL,
    "timestamp" timestamp without time zone DEFAULT now() NOT NULL,
    "isRead" boolean DEFAULT false NOT NULL,
    type character varying DEFAULT 'USER'::character varying NOT NULL,
    "readByUserId" text
);


ALTER TABLE public.chat_messages OWNER TO postgres;

--
-- Name: chat_messages_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.chat_messages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.chat_messages_id_seq OWNER TO postgres;

--
-- Name: chat_messages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.chat_messages_id_seq OWNED BY public.chat_messages.id;


--
-- Name: daily_order_summaries; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.daily_order_summaries (
    id integer NOT NULL,
    date date NOT NULL,
    station character varying NOT NULL,
    "totalItems" integer DEFAULT 0 NOT NULL,
    "itemsJson" text,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.daily_order_summaries OWNER TO postgres;

--
-- Name: daily_order_summaries_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.daily_order_summaries_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.daily_order_summaries_id_seq OWNER TO postgres;

--
-- Name: daily_order_summaries_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.daily_order_summaries_id_seq OWNED BY public.daily_order_summaries.id;


--
-- Name: employee_shift_schedules; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.employee_shift_schedules (
    id integer NOT NULL,
    "userId" integer NOT NULL,
    date date NOT NULL,
    "shiftName" character varying NOT NULL,
    "isSwap" boolean DEFAULT false NOT NULL,
    "swappedWithUserId" integer,
    "swapNote" text,
    "createdByAdminId" integer,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.employee_shift_schedules OWNER TO postgres;

--
-- Name: employee_shift_schedules_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.employee_shift_schedules_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.employee_shift_schedules_id_seq OWNER TO postgres;

--
-- Name: employee_shift_schedules_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.employee_shift_schedules_id_seq OWNED BY public.employee_shift_schedules.id;


--
-- Name: expenses; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.expenses (
    id integer NOT NULL,
    amount numeric(12,2) NOT NULL,
    category public.expenses_category_enum DEFAULT 'other'::public.expenses_category_enum NOT NULL,
    description text NOT NULL,
    date timestamp without time zone DEFAULT now() NOT NULL,
    "recordedBy" character varying NOT NULL,
    "recordedByUserId" integer,
    status public.expenses_status_enum DEFAULT 'PENDING'::public.expenses_status_enum NOT NULL,
    "shiftId" integer,
    "businessDayId" integer
);


ALTER TABLE public.expenses OWNER TO postgres;

--
-- Name: expenses_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.expenses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.expenses_id_seq OWNER TO postgres;

--
-- Name: expenses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.expenses_id_seq OWNED BY public.expenses.id;


--
-- Name: ingredient_batches; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ingredient_batches (
    id integer NOT NULL,
    "ingredientId" integer NOT NULL,
    "stockInId" integer,
    "batchNumber" character varying NOT NULL,
    "initialQuantity" numeric(10,2) NOT NULL,
    "remainingQuantity" numeric(10,2) NOT NULL,
    "costPrice" numeric(12,2) NOT NULL,
    status public.ingredient_batches_status_enum DEFAULT 'AVAILABLE'::public.ingredient_batches_status_enum NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.ingredient_batches OWNER TO postgres;

--
-- Name: ingredient_batches_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.ingredient_batches_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.ingredient_batches_id_seq OWNER TO postgres;

--
-- Name: ingredient_batches_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.ingredient_batches_id_seq OWNED BY public.ingredient_batches.id;


--
-- Name: ingredients; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ingredients (
    id integer NOT NULL,
    name character varying NOT NULL,
    unit character varying NOT NULL,
    "stockQuantity" numeric(12,3) DEFAULT '0'::numeric NOT NULL,
    min_stock_level numeric(12,3) DEFAULT '0'::numeric NOT NULL,
    sku character varying,
    category character varying,
    "costPrice" numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    "expiryDate" timestamp without time zone,
    "lastAuditDate" timestamp without time zone,
    description text,
    "imageUrl" character varying,
    "yieldPercentage" numeric(5,2) DEFAULT '100'::numeric NOT NULL,
    "lastPurchasePrice" numeric(12,2),
    "lastPurchaseQuantity" numeric(12,3),
    "lastPurchaseUnit" character varying,
    "isMandatoryReporting" boolean DEFAULT false NOT NULL,
    department character varying(50) DEFAULT 'CASHIER'::character varying NOT NULL,
    "isHighValue" boolean DEFAULT false NOT NULL,
    "auditFrequency" character varying(20) DEFAULT 'SHIFT'::character varying NOT NULL,
    "isBatchTracked" boolean DEFAULT false NOT NULL,
    "baseUnit" character varying,
    "displayUnit" character varying,
    "conversionFactor" numeric(10,2),
    "wasteThreshold" numeric(10,2),
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    "deletedAt" timestamp without time zone
);


ALTER TABLE public.ingredients OWNER TO postgres;

--
-- Name: COLUMN ingredients."auditFrequency"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.ingredients."auditFrequency" IS 'Audit frequency: SHIFT, DAILY, WEEKLY';


--
-- Name: ingredients_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.ingredients_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.ingredients_id_seq OWNER TO postgres;

--
-- Name: ingredients_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.ingredients_id_seq OWNED BY public.ingredients.id;


--
-- Name: inventory_waste; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.inventory_waste (
    id integer NOT NULL,
    "ingredientId" integer NOT NULL,
    quantity numeric(10,3) NOT NULL,
    valuation numeric(15,2) NOT NULL,
    reason text NOT NULL,
    status public.inventory_waste_status_enum DEFAULT 'PENDING'::public.inventory_waste_status_enum NOT NULL,
    "recordedByUserId" integer,
    "businessDayId" integer,
    "imageUrl" text,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "deletedAt" timestamp without time zone
);


ALTER TABLE public.inventory_waste OWNER TO postgres;

--
-- Name: inventory_waste_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.inventory_waste_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.inventory_waste_id_seq OWNER TO postgres;

--
-- Name: inventory_waste_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.inventory_waste_id_seq OWNED BY public.inventory_waste.id;


--
-- Name: locker_sessions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.locker_sessions (
    id integer NOT NULL,
    "lockerId" integer NOT NULL,
    "customerName" character varying NOT NULL,
    phone character varying,
    "identityNumber" character varying,
    "pinHash" character varying NOT NULL,
    "memberId" integer,
    "memberName" character varying,
    "isMemberFree" boolean DEFAULT false NOT NULL,
    price numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    "startTime" timestamp without time zone NOT NULL,
    "endTime" timestamp without time zone,
    status character varying DEFAULT 'ACTIVE'::character varying NOT NULL,
    "handledByName" character varying,
    "handledById" integer,
    "failedPinAttempts" integer DEFAULT 0 NOT NULL,
    "isLocked" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.locker_sessions OWNER TO postgres;

--
-- Name: locker_sessions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.locker_sessions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.locker_sessions_id_seq OWNER TO postgres;

--
-- Name: locker_sessions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.locker_sessions_id_seq OWNED BY public.locker_sessions.id;


--
-- Name: lockers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.lockers (
    id integer NOT NULL,
    number character varying NOT NULL,
    label character varying,
    "categoryId" integer,
    status character varying DEFAULT 'AVAILABLE'::character varying NOT NULL,
    "macAddress" character varying,
    "relayPin" integer,
    "isActive" boolean DEFAULT true NOT NULL,
    "pricePerHour" numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    notes text,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    "deletedAt" timestamp without time zone
);


ALTER TABLE public.lockers OWNER TO postgres;

--
-- Name: lockers_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.lockers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.lockers_id_seq OWNER TO postgres;

--
-- Name: lockers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.lockers_id_seq OWNED BY public.lockers.id;


--
-- Name: member_missions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.member_missions (
    id integer NOT NULL,
    "memberId" integer NOT NULL,
    "missionId" integer NOT NULL,
    "currentValue" integer DEFAULT 0 NOT NULL,
    "isCompleted" boolean DEFAULT false NOT NULL,
    "isClaimed" boolean DEFAULT false NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.member_missions OWNER TO postgres;

--
-- Name: member_missions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.member_missions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.member_missions_id_seq OWNER TO postgres;

--
-- Name: member_missions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.member_missions_id_seq OWNED BY public.member_missions.id;


--
-- Name: member_tiers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.member_tiers (
    id integer NOT NULL,
    name character varying NOT NULL,
    "discountConfig" json NOT NULL,
    "activeStartTime" character varying DEFAULT '00:00'::character varying NOT NULL,
    "activeEndTime" character varying DEFAULT '23:59'::character varying NOT NULL,
    "pointMultiplier" integer DEFAULT 1 NOT NULL,
    "activeDates" json,
    "activeDays" json,
    "isActive" boolean DEFAULT true NOT NULL,
    "autoUpgradeSpend" numeric(15,2),
    "minimumTopUp" numeric(15,2),
    "birthdayDiscountPct" integer,
    "doublePointDays" json,
    "bonusTopupConfig" json,
    "freeItemTrigger" text,
    "referralBonusPoints" integer,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.member_tiers OWNER TO postgres;

--
-- Name: member_tiers_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.member_tiers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.member_tiers_id_seq OWNER TO postgres;

--
-- Name: member_tiers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.member_tiers_id_seq OWNED BY public.member_tiers.id;


--
-- Name: members; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.members (
    id integer NOT NULL,
    "rfidUid" character varying,
    name character varying NOT NULL,
    "memberCode" character varying,
    phone character varying,
    balance numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    "discountPercentage" integer DEFAULT 0 NOT NULL,
    "tierId" integer,
    "expiryDate" timestamp without time zone,
    "securityVersion" integer DEFAULT 1 NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    points integer DEFAULT 0 NOT NULL,
    "targetWinRate" integer,
    "totalSpend" numeric(15,2) DEFAULT '0'::numeric NOT NULL,
    "birthDate" date,
    "referralCode" character varying,
    "referredById" integer,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.members OWNER TO postgres;

--
-- Name: members_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.members_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.members_id_seq OWNER TO postgres;

--
-- Name: members_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.members_id_seq OWNED BY public.members.id;


--
-- Name: menu_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.menu_items (
    id integer NOT NULL,
    name character varying NOT NULL,
    "categoryId" integer,
    "productionTarget" character varying(50),
    "expiryDate" date,
    sku character varying,
    description text,
    "imageUrl" character varying,
    price numeric(10,2) NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "taxPercentage" numeric(5,2) DEFAULT '0'::numeric NOT NULL,
    "stockQuantity" numeric(10,3) DEFAULT '0'::numeric NOT NULL,
    "minStockLevel" numeric(10,3) DEFAULT '0'::numeric NOT NULL,
    "isSubRecipe" boolean DEFAULT false NOT NULL,
    "yieldPercentage" numeric(5,2) DEFAULT '100'::numeric NOT NULL,
    "isMandatoryReporting" boolean DEFAULT false NOT NULL,
    department character varying(50) DEFAULT 'CASHIER'::character varying NOT NULL,
    "isHighValue" boolean DEFAULT false NOT NULL,
    "auditFrequency" character varying(20) DEFAULT 'SHIFT'::character varying NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    "deletedAt" timestamp without time zone
);


ALTER TABLE public.menu_items OWNER TO postgres;

--
-- Name: COLUMN menu_items."productionTarget"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.menu_items."productionTarget" IS 'Override category production target if needed';


--
-- Name: COLUMN menu_items."auditFrequency"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.menu_items."auditFrequency" IS 'Audit frequency: SHIFT, DAILY, WEEKLY';


--
-- Name: menu_items_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.menu_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.menu_items_id_seq OWNER TO postgres;

--
-- Name: menu_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.menu_items_id_seq OWNED BY public.menu_items.id;


--
-- Name: missions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.missions (
    id integer NOT NULL,
    title character varying NOT NULL,
    description text NOT NULL,
    code character varying NOT NULL,
    "rewardPoints" integer NOT NULL,
    "targetValue" integer DEFAULT 1 NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    icon character varying,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.missions OWNER TO postgres;

--
-- Name: missions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.missions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.missions_id_seq OWNER TO postgres;

--
-- Name: missions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.missions_id_seq OWNED BY public.missions.id;


--
-- Name: order_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.order_items (
    id integer NOT NULL,
    status public.order_items_status_enum DEFAULT 'QUEUED'::public.order_items_status_enum NOT NULL,
    "transactionId" integer NOT NULL,
    "menuItemId" integer NOT NULL,
    quantity numeric(10,3) NOT NULL,
    "priceAtOrder" numeric(10,2) NOT NULL,
    "discountPercentage" numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    "discountAmount" numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    "isPaid" boolean DEFAULT false NOT NULL,
    "paymentId" integer,
    note character varying,
    "customName" character varying,
    station character varying,
    "bundleGroupId" character varying,
    "cancelledAt" timestamp without time zone,
    "cancelledBy" character varying,
    "cancelReason" character varying,
    "completedByUserId" integer,
    "completedAt" timestamp without time zone,
    "createdByUserId" integer,
    "commissionUserId" integer,
    "payrollReleaseId" integer,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.order_items OWNER TO postgres;

--
-- Name: order_items_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.order_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.order_items_id_seq OWNER TO postgres;

--
-- Name: order_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.order_items_id_seq OWNED BY public.order_items.id;


--
-- Name: order_items_archive; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.order_items_archive (
    id integer DEFAULT nextval('public.order_items_id_seq'::regclass) NOT NULL,
    status public.order_items_status_enum DEFAULT 'QUEUED'::public.order_items_status_enum NOT NULL,
    "transactionId" integer NOT NULL,
    "menuItemId" integer NOT NULL,
    quantity numeric(10,3) NOT NULL,
    "priceAtOrder" numeric(10,2) NOT NULL,
    "discountPercentage" numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    "discountAmount" numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    "isPaid" boolean DEFAULT false NOT NULL,
    "paymentId" integer,
    note character varying,
    "customName" character varying,
    station character varying,
    "bundleGroupId" character varying,
    "cancelledAt" timestamp without time zone,
    "cancelledBy" character varying,
    "cancelReason" character varying,
    "completedByUserId" integer,
    "completedAt" timestamp without time zone,
    "createdByUserId" integer,
    "commissionUserId" integer,
    "payrollReleaseId" integer,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.order_items_archive OWNER TO postgres;

--
-- Name: payroll_configs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.payroll_configs (
    id integer NOT NULL,
    "basicSalary" numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    "overtimeRate" numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    "commissionService" numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    "commissionSalesPercent" numeric(5,2) DEFAULT '0'::numeric NOT NULL,
    "categoryCommissions" json,
    "penaltyLate" numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    "penaltyIdle" numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    "idleThreshold" integer DEFAULT 5 NOT NULL,
    "userId" integer
);


ALTER TABLE public.payroll_configs OWNER TO postgres;

--
-- Name: payroll_configs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.payroll_configs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.payroll_configs_id_seq OWNER TO postgres;

--
-- Name: payroll_configs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.payroll_configs_id_seq OWNED BY public.payroll_configs.id;


--
-- Name: payroll_releases; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.payroll_releases (
    id integer NOT NULL,
    "userId" integer,
    month integer NOT NULL,
    year integer NOT NULL,
    "basicSalary" numeric(12,2) NOT NULL,
    "commissionService" numeric(12,2) NOT NULL,
    "commissionSales" numeric(12,2) NOT NULL,
    "commissionProduction" numeric(12,2) NOT NULL,
    penalties numeric(12,2) NOT NULL,
    "totalPayout" numeric(12,2) NOT NULL,
    details json,
    "releasedAt" timestamp without time zone,
    "releasedByUserId" integer,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.payroll_releases OWNER TO postgres;

--
-- Name: payroll_releases_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.payroll_releases_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.payroll_releases_id_seq OWNER TO postgres;

--
-- Name: payroll_releases_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.payroll_releases_id_seq OWNED BY public.payroll_releases.id;


--
-- Name: point_ledgers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.point_ledgers (
    id bigint NOT NULL,
    "memberId" integer NOT NULL,
    type public.point_ledgers_type_enum NOT NULL,
    amount integer NOT NULL,
    description text,
    "referenceId" character varying,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.point_ledgers OWNER TO postgres;

--
-- Name: point_ledgers_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.point_ledgers_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.point_ledgers_id_seq OWNER TO postgres;

--
-- Name: point_ledgers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.point_ledgers_id_seq OWNED BY public.point_ledgers.id;


--
-- Name: point_rewards; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.point_rewards (
    id integer NOT NULL,
    name character varying NOT NULL,
    category public.point_rewards_category_enum NOT NULL,
    "pointCost" integer NOT NULL,
    stock integer DEFAULT 0 NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    image character varying,
    "menuItemId" integer,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.point_rewards OWNER TO postgres;

--
-- Name: point_rewards_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.point_rewards_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.point_rewards_id_seq OWNER TO postgres;

--
-- Name: point_rewards_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.point_rewards_id_seq OWNED BY public.point_rewards.id;


--
-- Name: printers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.printers (
    id integer NOT NULL,
    name character varying NOT NULL,
    "connectionType" public.printers_connectiontype_enum DEFAULT 'IP'::public.printers_connectiontype_enum NOT NULL,
    "ipAddress" character varying NOT NULL,
    port integer DEFAULT 9100 NOT NULL,
    type public.printers_type_enum DEFAULT 'KITCHEN'::public.printers_type_enum NOT NULL,
    floor integer DEFAULT 1 NOT NULL,
    "coverageZones" json,
    "isActive" boolean DEFAULT true NOT NULL,
    "isOnline" boolean DEFAULT false NOT NULL,
    "isBackup" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.printers OWNER TO postgres;

--
-- Name: printers_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.printers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.printers_id_seq OWNER TO postgres;

--
-- Name: printers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.printers_id_seq OWNED BY public.printers.id;


--
-- Name: product_finances; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.product_finances (
    id integer NOT NULL,
    "menuItemId" integer NOT NULL,
    "baseHpp" numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    "targetMarginPercent" numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    "targetMarkupFixed" numeric(15,2) DEFAULT '0'::numeric NOT NULL,
    "targetMarkupPercent" numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    "targetMultiplier" numeric(12,2) DEFAULT '1'::numeric NOT NULL,
    "maxHppThreshold" numeric(12,2) DEFAULT '35'::numeric NOT NULL,
    "pricingAdvice" text,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.product_finances OWNER TO postgres;

--
-- Name: product_finances_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.product_finances_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.product_finances_id_seq OWNER TO postgres;

--
-- Name: product_finances_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.product_finances_id_seq OWNED BY public.product_finances.id;


--
-- Name: promos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.promos (
    id integer NOT NULL,
    name character varying NOT NULL,
    type public.promos_type_enum NOT NULL,
    description text,
    "isActive" boolean DEFAULT true NOT NULL,
    "startDate" timestamp without time zone,
    "endDate" timestamp without time zone,
    "ruleJson" json NOT NULL,
    "usageCount" integer DEFAULT 0 NOT NULL,
    "totalRevenueContribution" numeric(15,2) DEFAULT '0'::numeric NOT NULL,
    "totalProfitContribution" numeric(15,2) DEFAULT '0'::numeric NOT NULL,
    "estimatedHpp" numeric(15,2) DEFAULT '0'::numeric NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.promos OWNER TO postgres;

--
-- Name: promos_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.promos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.promos_id_seq OWNER TO postgres;

--
-- Name: promos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.promos_id_seq OWNED BY public.promos.id;


--
-- Name: public_holidays; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.public_holidays (
    id integer NOT NULL,
    name character varying NOT NULL,
    date date NOT NULL,
    "isClosure" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.public_holidays OWNER TO postgres;

--
-- Name: public_holidays_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.public_holidays_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.public_holidays_id_seq OWNER TO postgres;

--
-- Name: public_holidays_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.public_holidays_id_seq OWNED BY public.public_holidays.id;


--
-- Name: push_subscriptions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.push_subscriptions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    endpoint text NOT NULL,
    keys json NOT NULL,
    "userId" integer NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.push_subscriptions OWNER TO postgres;

--
-- Name: recipes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.recipes (
    id integer NOT NULL,
    "menuItemId" integer NOT NULL,
    "ingredientId" integer,
    "subMenuItemId" integer,
    quantity numeric(12,3) NOT NULL,
    unit character varying NOT NULL
);


ALTER TABLE public.recipes OWNER TO postgres;

--
-- Name: recipes_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.recipes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.recipes_id_seq OWNER TO postgres;

--
-- Name: recipes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.recipes_id_seq OWNED BY public.recipes.id;


--
-- Name: roles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.roles (
    id integer NOT NULL,
    name character varying NOT NULL,
    permissions json NOT NULL,
    "approvalLevel" integer DEFAULT 1 NOT NULL,
    description text
);


ALTER TABLE public.roles OWNER TO postgres;

--
-- Name: roles_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.roles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.roles_id_seq OWNER TO postgres;

--
-- Name: roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.roles_id_seq OWNED BY public.roles.id;


--
-- Name: sessions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sessions (
    id integer NOT NULL,
    "memberId" integer,
    "sessionType" public.sessions_sessiontype_enum NOT NULL,
    "startTime" timestamp without time zone NOT NULL,
    "endTime" timestamp without time zone,
    "durationMinutes" integer,
    "totalPrice" numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    "isPaid" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    "tableId" integer
);


ALTER TABLE public.sessions OWNER TO postgres;

--
-- Name: sessions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.sessions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.sessions_id_seq OWNER TO postgres;

--
-- Name: sessions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.sessions_id_seq OWNED BY public.sessions.id;


--
-- Name: settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.settings (
    id integer NOT NULL,
    "businessName" character varying DEFAULT 'My Billiard & Cafe'::character varying NOT NULL,
    address text,
    contact character varying,
    "socialMediaLink" character varying,
    "logoPath" character varying,
    "ppnPercentage" numeric(5,2) DEFAULT '0'::numeric NOT NULL,
    "serviceChargePercentage" numeric(5,2) DEFAULT '0'::numeric NOT NULL,
    "roundingKelipatan" integer DEFAULT 100 NOT NULL,
    "businessDayOffset" character varying DEFAULT '00:00'::character varying NOT NULL,
    "autoMaintenanceTime" character varying DEFAULT '03:00'::character varying NOT NULL,
    "availablePaymentMethods" json,
    "mqttBrokerAddress" character varying DEFAULT '127.0.0.1'::character varying NOT NULL,
    "tftWallpaper" text,
    "invoiceBusinessName" character varying,
    "invoiceAddress" text,
    "invoiceContact" character varying,
    "invoiceSocialMedia" character varying,
    "invoiceFooterNote" text,
    "customPricingDynamic" json,
    "availableShifts" json,
    "shiftEndingWarningMinutes" integer DEFAULT 10 NOT NULL,
    "endingSoonThreshold" integer DEFAULT 5 NOT NULL,
    "balanceBuffer" integer DEFAULT 2000 NOT NULL,
    "balanceWarningMinutes" integer DEFAULT 15 NOT NULL,
    "royaltyPointsPerAmount" integer DEFAULT 1000 NOT NULL,
    "royaltyPointRedeemValue" integer DEFAULT 200 NOT NULL,
    "scratchBombWinRate" integer DEFAULT 5 NOT NULL,
    "scratchBombRewards" character varying DEFAULT '1,2,5,10,20,50,100'::character varying NOT NULL,
    "scratchBombAvgWinPts" integer DEFAULT 25 NOT NULL,
    "gamificationAutoPilot" boolean DEFAULT false NOT NULL,
    "gamificationTargetSurplus" integer DEFAULT 5000000 NOT NULL,
    "scratchBombPlayCost" integer DEFAULT 2 NOT NULL,
    "pointExpiryDays" integer DEFAULT 90 NOT NULL,
    "scratchBombPool" integer DEFAULT 0 NOT NULL,
    "mahjongSlotWinRate" integer DEFAULT 15 NOT NULL,
    "mahjongSlotPool" integer DEFAULT 0 NOT NULL,
    "isEmergencyMode" boolean DEFAULT false NOT NULL,
    "printerWidth" integer DEFAULT 80 NOT NULL,
    "displayPromotions" json,
    "ownerPhone" character varying,
    "autoReportEnabled" boolean DEFAULT false NOT NULL,
    "reportSchedule" character varying DEFAULT '23:55'::character varying NOT NULL,
    "waTemplateWelcome" text,
    "aiStaffingRatio" integer DEFAULT 5 NOT NULL,
    "aiAutoPromote" boolean DEFAULT false NOT NULL,
    "aiAutoPromoteThreshold" numeric(3,2) DEFAULT 0.6 NOT NULL,
    "waTemplateSessionEnd" text,
    "autoSettlementEnabled" boolean DEFAULT false NOT NULL,
    "autoSettlementTime" character varying DEFAULT '04:00'::character varying NOT NULL,
    "approvalConfig" json,
    "bounceBackConfig" json,
    "isIotBypassed" boolean DEFAULT false NOT NULL
);


ALTER TABLE public.settings OWNER TO postgres;

--
-- Name: settings_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.settings_id_seq OWNER TO postgres;

--
-- Name: settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.settings_id_seq OWNED BY public.settings.id;


--
-- Name: shift_stock_reports; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.shift_stock_reports (
    id integer NOT NULL,
    "shiftId" integer NOT NULL,
    "ingredientId" integer,
    "menuItemId" integer,
    "itemName" character varying,
    "systemStock" numeric(12,3) DEFAULT '0'::numeric NOT NULL,
    "physicalStock" numeric(12,3) DEFAULT '0'::numeric NOT NULL,
    discrepancy numeric(12,3) DEFAULT '0'::numeric NOT NULL,
    "lostValue" numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    unit character varying,
    note text,
    department character varying(50),
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.shift_stock_reports OWNER TO postgres;

--
-- Name: shift_stock_reports_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.shift_stock_reports_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.shift_stock_reports_id_seq OWNER TO postgres;

--
-- Name: shift_stock_reports_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.shift_stock_reports_id_seq OWNED BY public.shift_stock_reports.id;


--
-- Name: shifts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.shifts (
    id integer NOT NULL,
    "userId" integer,
    "businessDayId" integer NOT NULL,
    "startTime" timestamp without time zone DEFAULT now() NOT NULL,
    "shiftName" character varying,
    "endTime" timestamp without time zone,
    "cashStart" numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    "cashSystem" numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    "cashPhysical" numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    discrepancy numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    "totalTopUp" numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    note text,
    status public.shifts_status_enum DEFAULT 'OPEN'::public.shifts_status_enum NOT NULL,
    "startedBy" character varying,
    "endedBy" character varying,
    "approvalStatus" public.shifts_approvalstatus_enum DEFAULT 'APPROVED'::public.shifts_approvalstatus_enum NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "latenessMinutes" integer DEFAULT 0 NOT NULL,
    "overtimeMinutes" integer DEFAULT 0 NOT NULL,
    "assignedTableIds" text,
    "cashRevenue" numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    "nonCashRevenue" numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    "totalExpenses" numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    "attachmentUrl" text,
    "performanceSummary" json,
    "stockReportStatus" json,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.shifts OWNER TO postgres;

--
-- Name: shifts_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.shifts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.shifts_id_seq OWNER TO postgres;

--
-- Name: shifts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.shifts_id_seq OWNED BY public.shifts.id;


--
-- Name: stock_ins; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.stock_ins (
    id integer NOT NULL,
    "ingredientId" integer NOT NULL,
    "supplierId" integer,
    quantity numeric(12,2) NOT NULL,
    unit character varying NOT NULL,
    "purchasePrice" numeric(12,2) NOT NULL,
    "totalCost" numeric(12,2) NOT NULL,
    "receivedByUserId" integer,
    notes text,
    "paymentStatus" public.stock_ins_paymentstatus_enum DEFAULT 'PAID'::public.stock_ins_paymentstatus_enum NOT NULL,
    "dueDate" timestamp without time zone,
    "paidAmount" numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    "invoiceNumber" character varying,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.stock_ins OWNER TO postgres;

--
-- Name: stock_ins_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.stock_ins_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.stock_ins_id_seq OWNER TO postgres;

--
-- Name: stock_ins_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.stock_ins_id_seq OWNED BY public.stock_ins.id;


--
-- Name: stock_installment_plans; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.stock_installment_plans (
    id integer NOT NULL,
    "stockInId" integer NOT NULL,
    "dueDate" timestamp without time zone NOT NULL,
    amount numeric(12,2) NOT NULL,
    "isPaid" boolean DEFAULT false NOT NULL,
    "paidAt" timestamp without time zone,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.stock_installment_plans OWNER TO postgres;

--
-- Name: stock_installment_plans_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.stock_installment_plans_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.stock_installment_plans_id_seq OWNER TO postgres;

--
-- Name: stock_installment_plans_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.stock_installment_plans_id_seq OWNED BY public.stock_installment_plans.id;


--
-- Name: stock_payments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.stock_payments (
    id integer NOT NULL,
    "stockInId" integer NOT NULL,
    amount numeric(12,2) NOT NULL,
    "paymentMethod" character varying NOT NULL,
    "userId" integer,
    notes text,
    "paidAt" timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.stock_payments OWNER TO postgres;

--
-- Name: stock_payments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.stock_payments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.stock_payments_id_seq OWNER TO postgres;

--
-- Name: stock_payments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.stock_payments_id_seq OWNED BY public.stock_payments.id;


--
-- Name: suppliers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.suppliers (
    id integer NOT NULL,
    name character varying NOT NULL,
    "contactPerson" character varying,
    phone character varying,
    email character varying,
    address text,
    category character varying,
    description text,
    "isActive" boolean DEFAULT true NOT NULL,
    rating numeric(3,2) DEFAULT '5'::numeric NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.suppliers OWNER TO postgres;

--
-- Name: suppliers_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.suppliers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.suppliers_id_seq OWNER TO postgres;

--
-- Name: suppliers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.suppliers_id_seq OWNED BY public.suppliers.id;


--
-- Name: tables; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tables (
    id integer NOT NULL,
    "tableName" character varying NOT NULL,
    "stationType" public.tables_stationtype_enum DEFAULT 'BILLIARD'::public.tables_stationtype_enum NOT NULL,
    "categoryId" integer,
    "macAddress" character varying,
    "ipAddress" character varying,
    "floorNumber" integer DEFAULT 1,
    "productionZone" character varying,
    "espnowGatewayMac" character varying,
    "hardwareType" public.tables_hardwaretype_enum DEFAULT 'PCF8575'::public.tables_hardwaretype_enum,
    status public.tables_status_enum DEFAULT 'available'::public.tables_status_enum NOT NULL,
    rssi integer,
    uptime bigint,
    "lastHeartbeat" timestamp without time zone,
    "isLightOn" boolean DEFAULT false NOT NULL,
    "relayPin" integer,
    "sessionType" public.tables_sessiontype_enum,
    "startTime" timestamp without time zone,
    "endTime" timestamp without time zone,
    "remainingMinutes" integer,
    "packageId" integer,
    "activePackagePrice" numeric(12,2),
    "lastSessionData" json,
    "isBooked" boolean DEFAULT false NOT NULL,
    "bookedByWaitingId" integer,
    "bookedByName" character varying,
    "memberId" integer,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    "deletedAt" timestamp without time zone
);


ALTER TABLE public.tables OWNER TO postgres;

--
-- Name: tables_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.tables_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.tables_id_seq OWNER TO postgres;

--
-- Name: tables_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.tables_id_seq OWNED BY public.tables.id;


--
-- Name: transaction_payments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.transaction_payments (
    id integer NOT NULL,
    "transactionId" integer NOT NULL,
    "payerName" character varying,
    "itemsSubtotal" numeric(12,2) NOT NULL,
    "billiardPortion" numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    "discountAmount" numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    "taxAmount" numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    "serviceAmount" numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    "roundingAmount" numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    "totalPaid" numeric(12,2) NOT NULL,
    "paymentMethod" character varying NOT NULL,
    "itemsSnapshot" json,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "createdByUserId" integer,
    "shiftId" integer,
    "businessDayId" integer
);


ALTER TABLE public.transaction_payments OWNER TO postgres;

--
-- Name: transaction_payments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.transaction_payments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.transaction_payments_id_seq OWNER TO postgres;

--
-- Name: transaction_payments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.transaction_payments_id_seq OWNED BY public.transaction_payments.id;


--
-- Name: transaction_payments_archive; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.transaction_payments_archive (
    id integer DEFAULT nextval('public.transaction_payments_id_seq'::regclass) NOT NULL,
    "transactionId" integer NOT NULL,
    "payerName" character varying,
    "itemsSubtotal" numeric(12,2) NOT NULL,
    "billiardPortion" numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    "discountAmount" numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    "taxAmount" numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    "serviceAmount" numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    "roundingAmount" numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    "totalPaid" numeric(12,2) NOT NULL,
    "paymentMethod" character varying NOT NULL,
    "itemsSnapshot" json,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "createdByUserId" integer,
    "shiftId" integer,
    "businessDayId" integer
);


ALTER TABLE public.transaction_payments_archive OWNER TO postgres;

--
-- Name: transactions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.transactions (
    id integer NOT NULL,
    "invoiceNumber" character varying NOT NULL,
    "customerName" character varying,
    "customerPhone" character varying,
    "generatedBounceBackCode" character varying,
    "tableId" integer,
    "cafeTableId" integer,
    "memberId" integer,
    status public.transactions_status_enum DEFAULT 'UNPAID'::public.transactions_status_enum NOT NULL,
    type public.transactions_type_enum DEFAULT 'BILLIARD'::public.transactions_type_enum NOT NULL,
    "sessionType" character varying,
    "fareName" character varying,
    "startTime" timestamp without time zone,
    "endTime" timestamp without time zone,
    "sessionDuration" character varying,
    "billiardTotal" numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    "cafeTotal" numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    "grandTotal" numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    "discountAmount" numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    "vatAmount" numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    "serviceChargeAmount" numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    "roundingAmount" numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    "paidAmount" numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    "paymentDetails" json,
    "billingDetails" json,
    remarks text,
    "appliedPromos" json,
    "createdByUserId" integer,
    "openedByUserId" integer,
    "commissionUserId" integer,
    "paidByUserId" integer,
    "shiftId" integer,
    "businessDayId" integer,
    "packageId" integer,
    "awardedPoints" integer DEFAULT 0 NOT NULL,
    "awardedSpend" numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    "payrollReleaseId" integer,
    "voucherCode" character varying,
    "voucherId" integer,
    "voucherDiscountAmount" numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    "cashbackEarned" numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.transactions OWNER TO postgres;

--
-- Name: transactions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.transactions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.transactions_id_seq OWNER TO postgres;

--
-- Name: transactions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.transactions_id_seq OWNED BY public.transactions.id;


--
-- Name: transactions_archive; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.transactions_archive (
    id integer DEFAULT nextval('public.transactions_id_seq'::regclass) NOT NULL,
    "invoiceNumber" character varying NOT NULL,
    "customerName" character varying,
    "customerPhone" character varying,
    "generatedBounceBackCode" character varying,
    "tableId" integer,
    "cafeTableId" integer,
    "memberId" integer,
    status public.transactions_status_enum DEFAULT 'UNPAID'::public.transactions_status_enum NOT NULL,
    type public.transactions_type_enum DEFAULT 'BILLIARD'::public.transactions_type_enum NOT NULL,
    "sessionType" character varying,
    "fareName" character varying,
    "startTime" timestamp without time zone,
    "endTime" timestamp without time zone,
    "sessionDuration" character varying,
    "billiardTotal" numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    "cafeTotal" numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    "grandTotal" numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    "discountAmount" numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    "vatAmount" numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    "serviceChargeAmount" numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    "roundingAmount" numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    "paidAmount" numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    "paymentDetails" json,
    "billingDetails" json,
    remarks text,
    "appliedPromos" json,
    "createdByUserId" integer,
    "openedByUserId" integer,
    "commissionUserId" integer,
    "paidByUserId" integer,
    "shiftId" integer,
    "businessDayId" integer,
    "packageId" integer,
    "awardedPoints" integer DEFAULT 0 NOT NULL,
    "awardedSpend" numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    "payrollReleaseId" integer,
    "voucherCode" character varying,
    "voucherId" integer,
    "voucherDiscountAmount" numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    "cashbackEarned" numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.transactions_archive OWNER TO postgres;

--
-- Name: user_status_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_status_logs (
    id integer NOT NULL,
    status character varying NOT NULL,
    "startedAt" timestamp without time zone DEFAULT now() NOT NULL,
    "endedAt" timestamp without time zone,
    "durationSeconds" integer DEFAULT 0 NOT NULL,
    "userId" integer
);


ALTER TABLE public.user_status_logs OWNER TO postgres;

--
-- Name: user_status_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.user_status_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_status_logs_id_seq OWNER TO postgres;

--
-- Name: user_status_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.user_status_logs_id_seq OWNED BY public.user_status_logs.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    name character varying NOT NULL,
    "placeOfBirth" character varying,
    "dateOfBirth" date,
    gender character varying,
    address text,
    religion character varying,
    "maritalStatus" character varying,
    "jobTitle" character varying,
    nationality character varying,
    "joinedAt" date,
    email character varying,
    phone character varying,
    username character varying NOT NULL,
    password character varying NOT NULL,
    pin character varying,
    rfid character varying,
    "fingerprintData" text,
    "securityMode" public.users_securitymode_enum DEFAULT 'HYBRID'::public.users_securitymode_enum NOT NULL,
    status public.users_status_enum DEFAULT 'OFFLINE'::public.users_status_enum NOT NULL,
    "isVerified" boolean DEFAULT true NOT NULL,
    "baseShift" character varying,
    "socketId" character varying,
    "lastSeen" timestamp without time zone,
    "assignedTableIds" text,
    "currentActivePage" character varying,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    "roleId" integer
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: violations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.violations (
    id integer NOT NULL,
    "userId" integer,
    type public.violations_type_enum NOT NULL,
    description text,
    "penaltyAmount" numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    "durationMinutes" integer,
    "shiftId" integer,
    "businessDayId" integer,
    "payrollReleaseId" integer,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.violations OWNER TO postgres;

--
-- Name: violations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.violations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.violations_id_seq OWNER TO postgres;

--
-- Name: violations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.violations_id_seq OWNED BY public.violations.id;


--
-- Name: vouchers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.vouchers (
    id integer NOT NULL,
    code character varying NOT NULL,
    name character varying NOT NULL,
    description text,
    type public.vouchers_type_enum NOT NULL,
    "discountValue" numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    "freeMenuItemId" integer,
    "maxDiscountAmount" numeric(12,2),
    "minTransactionAmount" numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    "usageLimit" integer,
    "usageCount" integer DEFAULT 0 NOT NULL,
    "userId" integer,
    "createdByUserId" integer,
    "isBounceBack" boolean DEFAULT false NOT NULL,
    "sourceTransactionId" integer,
    "memberId" integer,
    "validDays" json,
    "validStartTime" time without time zone,
    "validEndTime" time without time zone,
    "startDate" timestamp without time zone,
    "endDate" timestamp without time zone,
    "isActive" boolean DEFAULT true NOT NULL,
    "ruleJson" json,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.vouchers OWNER TO postgres;

--
-- Name: vouchers_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.vouchers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.vouchers_id_seq OWNER TO postgres;

--
-- Name: vouchers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.vouchers_id_seq OWNED BY public.vouchers.id;


--
-- Name: waiting_lists; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.waiting_lists (
    id integer NOT NULL,
    type public.waiting_lists_type_enum DEFAULT 'BILLIARD'::public.waiting_lists_type_enum NOT NULL,
    "customerName" character varying NOT NULL,
    "phoneNumber" character varying,
    pax integer DEFAULT 1 NOT NULL,
    status public.waiting_lists_status_enum DEFAULT 'PENDING'::public.waiting_lists_status_enum NOT NULL,
    "targetTableId" integer,
    "targetTableName" character varying,
    "handledById" integer,
    "handledByName" character varying,
    note text,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.waiting_lists OWNER TO postgres;

--
-- Name: waiting_lists_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.waiting_lists_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.waiting_lists_id_seq OWNER TO postgres;

--
-- Name: waiting_lists_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.waiting_lists_id_seq OWNED BY public.waiting_lists.id;


--
-- Name: access_requests id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.access_requests ALTER COLUMN id SET DEFAULT nextval('public.access_requests_id_seq'::regclass);


--
-- Name: ai_upsell_prompts id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_upsell_prompts ALTER COLUMN id SET DEFAULT nextval('public.ai_upsell_prompts_id_seq'::regclass);


--
-- Name: approval_history id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.approval_history ALTER COLUMN id SET DEFAULT nextval('public.approval_history_id_seq'::regclass);


--
-- Name: approval_requests id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.approval_requests ALTER COLUMN id SET DEFAULT nextval('public.approval_requests_id_seq'::regclass);


--
-- Name: asset_categories id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asset_categories ALTER COLUMN id SET DEFAULT nextval('public.asset_categories_id_seq'::regclass);


--
-- Name: attendances id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attendances ALTER COLUMN id SET DEFAULT nextval('public.attendances_id_seq'::regclass);


--
-- Name: audit_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs ALTER COLUMN id SET DEFAULT nextval('public.audit_logs_id_seq'::regclass);


--
-- Name: battle_plan_items id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.battle_plan_items ALTER COLUMN id SET DEFAULT nextval('public.battle_plan_items_id_seq'::regclass);


--
-- Name: battle_plans id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.battle_plans ALTER COLUMN id SET DEFAULT nextval('public.battle_plans_id_seq'::regclass);


--
-- Name: billiard_packages id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.billiard_packages ALTER COLUMN id SET DEFAULT nextval('public.billiard_packages_id_seq'::regclass);


--
-- Name: business_closures id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.business_closures ALTER COLUMN id SET DEFAULT nextval('public.business_closures_id_seq'::regclass);


--
-- Name: business_days id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.business_days ALTER COLUMN id SET DEFAULT nextval('public.business_days_id_seq'::regclass);


--
-- Name: cafe_tables id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cafe_tables ALTER COLUMN id SET DEFAULT nextval('public.cafe_tables_id_seq'::regclass);


--
-- Name: cashflow id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cashflow ALTER COLUMN id SET DEFAULT nextval('public.cashflow_id_seq'::regclass);


--
-- Name: categories id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories ALTER COLUMN id SET DEFAULT nextval('public.categories_id_seq'::regclass);


--
-- Name: chat_messages id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_messages ALTER COLUMN id SET DEFAULT nextval('public.chat_messages_id_seq'::regclass);


--
-- Name: daily_order_summaries id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.daily_order_summaries ALTER COLUMN id SET DEFAULT nextval('public.daily_order_summaries_id_seq'::regclass);


--
-- Name: employee_shift_schedules id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employee_shift_schedules ALTER COLUMN id SET DEFAULT nextval('public.employee_shift_schedules_id_seq'::regclass);


--
-- Name: expenses id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expenses ALTER COLUMN id SET DEFAULT nextval('public.expenses_id_seq'::regclass);


--
-- Name: ingredient_batches id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ingredient_batches ALTER COLUMN id SET DEFAULT nextval('public.ingredient_batches_id_seq'::regclass);


--
-- Name: ingredients id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ingredients ALTER COLUMN id SET DEFAULT nextval('public.ingredients_id_seq'::regclass);


--
-- Name: inventory_waste id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_waste ALTER COLUMN id SET DEFAULT nextval('public.inventory_waste_id_seq'::regclass);


--
-- Name: locker_sessions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.locker_sessions ALTER COLUMN id SET DEFAULT nextval('public.locker_sessions_id_seq'::regclass);


--
-- Name: lockers id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lockers ALTER COLUMN id SET DEFAULT nextval('public.lockers_id_seq'::regclass);


--
-- Name: member_missions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.member_missions ALTER COLUMN id SET DEFAULT nextval('public.member_missions_id_seq'::regclass);


--
-- Name: member_tiers id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.member_tiers ALTER COLUMN id SET DEFAULT nextval('public.member_tiers_id_seq'::regclass);


--
-- Name: members id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.members ALTER COLUMN id SET DEFAULT nextval('public.members_id_seq'::regclass);


--
-- Name: menu_items id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.menu_items ALTER COLUMN id SET DEFAULT nextval('public.menu_items_id_seq'::regclass);


--
-- Name: missions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.missions ALTER COLUMN id SET DEFAULT nextval('public.missions_id_seq'::regclass);


--
-- Name: order_items id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items ALTER COLUMN id SET DEFAULT nextval('public.order_items_id_seq'::regclass);


--
-- Name: payroll_configs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payroll_configs ALTER COLUMN id SET DEFAULT nextval('public.payroll_configs_id_seq'::regclass);


--
-- Name: payroll_releases id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payroll_releases ALTER COLUMN id SET DEFAULT nextval('public.payroll_releases_id_seq'::regclass);


--
-- Name: point_ledgers id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.point_ledgers ALTER COLUMN id SET DEFAULT nextval('public.point_ledgers_id_seq'::regclass);


--
-- Name: point_rewards id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.point_rewards ALTER COLUMN id SET DEFAULT nextval('public.point_rewards_id_seq'::regclass);


--
-- Name: printers id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.printers ALTER COLUMN id SET DEFAULT nextval('public.printers_id_seq'::regclass);


--
-- Name: product_finances id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_finances ALTER COLUMN id SET DEFAULT nextval('public.product_finances_id_seq'::regclass);


--
-- Name: promos id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.promos ALTER COLUMN id SET DEFAULT nextval('public.promos_id_seq'::regclass);


--
-- Name: public_holidays id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.public_holidays ALTER COLUMN id SET DEFAULT nextval('public.public_holidays_id_seq'::regclass);


--
-- Name: recipes id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.recipes ALTER COLUMN id SET DEFAULT nextval('public.recipes_id_seq'::regclass);


--
-- Name: roles id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles ALTER COLUMN id SET DEFAULT nextval('public.roles_id_seq'::regclass);


--
-- Name: sessions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sessions ALTER COLUMN id SET DEFAULT nextval('public.sessions_id_seq'::regclass);


--
-- Name: settings id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.settings ALTER COLUMN id SET DEFAULT nextval('public.settings_id_seq'::regclass);


--
-- Name: shift_stock_reports id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shift_stock_reports ALTER COLUMN id SET DEFAULT nextval('public.shift_stock_reports_id_seq'::regclass);


--
-- Name: shifts id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shifts ALTER COLUMN id SET DEFAULT nextval('public.shifts_id_seq'::regclass);


--
-- Name: stock_ins id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_ins ALTER COLUMN id SET DEFAULT nextval('public.stock_ins_id_seq'::regclass);


--
-- Name: stock_installment_plans id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_installment_plans ALTER COLUMN id SET DEFAULT nextval('public.stock_installment_plans_id_seq'::regclass);


--
-- Name: stock_payments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_payments ALTER COLUMN id SET DEFAULT nextval('public.stock_payments_id_seq'::regclass);


--
-- Name: suppliers id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.suppliers ALTER COLUMN id SET DEFAULT nextval('public.suppliers_id_seq'::regclass);


--
-- Name: tables id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tables ALTER COLUMN id SET DEFAULT nextval('public.tables_id_seq'::regclass);


--
-- Name: transaction_payments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transaction_payments ALTER COLUMN id SET DEFAULT nextval('public.transaction_payments_id_seq'::regclass);


--
-- Name: transactions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transactions ALTER COLUMN id SET DEFAULT nextval('public.transactions_id_seq'::regclass);


--
-- Name: user_status_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_status_logs ALTER COLUMN id SET DEFAULT nextval('public.user_status_logs_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: violations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.violations ALTER COLUMN id SET DEFAULT nextval('public.violations_id_seq'::regclass);


--
-- Name: vouchers id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vouchers ALTER COLUMN id SET DEFAULT nextval('public.vouchers_id_seq'::regclass);


--
-- Name: waiting_lists id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.waiting_lists ALTER COLUMN id SET DEFAULT nextval('public.waiting_lists_id_seq'::regclass);


--
-- Data for Name: access_requests; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.access_requests (id, "userId", username, "employeeName", "roleName", status, "isOutOfShift", "shiftName", "shiftTimeRange", "approvedBy", "approvedByName", "socketId", note, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: ai_upsell_prompts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.ai_upsell_prompts (id, "businessDayId", "menuItemId", "packageId", "promoId", "tableId", "tableName", "isConverted", "isAcknowledged", "convertedAt", "transactionId", "convertedByUserId", "convertedByUserName", message, "isManual", "ackCount", "conversionValue", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: approval_history; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.approval_history (id, "approvalRequestId", "userId", level, action, note, "createdAt") FROM stdin;
1	2	1	1	VERIFY		2026-06-12 19:03:59.718869
2	2	1	2	APPROVE		2026-06-12 19:04:05.338532
3	3	1	1	VERIFY		2026-06-12 19:04:07.344075
4	3	1	2	APPROVE		2026-06-12 19:04:09.144719
5	1	1	1	VERIFY		2026-06-12 19:04:11.781077
6	1	1	2	APPROVE		2026-06-12 19:04:13.443219
7	4	1	1	VERIFY		2026-06-12 19:36:35.38019
8	4	1	2	APPROVE		2026-06-12 19:36:37.376889
9	5	1	1	BYPASS	[BYPASS] 	2026-06-13 03:41:50.90799
10	7	1	1	BYPASS	[BYPASS] 	2026-06-13 03:57:54.057707
11	6	1	1	BYPASS	[BYPASS] 	2026-06-13 03:57:58.430462
12	9	1	1	VERIFY		2026-06-13 03:58:16.890705
13	9	1	2	APPROVE		2026-06-13 03:58:18.326244
14	8	1	1	VERIFY		2026-06-13 03:58:19.5636
15	8	1	2	APPROVE		2026-06-13 03:58:20.905391
16	10	1	1	VERIFY		2026-06-13 04:06:57.939786
17	10	1	2	APPROVE		2026-06-13 04:06:58.999151
\.


--
-- Data for Name: approval_requests; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.approval_requests (id, "moduleType", "referenceId", "requiredLevels", "currentLevelIndex", status, metadata, "requestedByUserId", "createdAt", "updatedAt") FROM stdin;
2	DATA_EDIT	7	[1,2]	1	APPROVED	{"entityType":"INGREDIENT","itemName":"STRAWBERRY BUBBLEGUM","price":15000,"payload":{"name":"STRAWBERRY BUBBLEGUM","sku":"IG-007","category":"MINUMAN","unit":"Pcs","costPrice":15000,"stockQuantity":9,"minStockLevel":10,"yieldPercentage":100,"description":"","imageUrl":"","department":"BAR","isHighValue":false,"isMandatoryReporting":false,"auditFrequency":"SHIFT","expiryDate":null,"isBatchTracked":false,"baseUnit":"","displayUnit":"","conversionFactor":0,"wasteThreshold":0},"changes":{"unit":{"old":"Gram","new":"Pcs"}},"fieldLabels":{"name":"Nama","sku":"SKU","category":"Kategori","unit":"Satuan","costPrice":"Harga Beli","stockQuantity":"Stok Saat Ini","minStockLevel":"Batas Minimum","yieldPercentage":"% Yield","description":"Deskripsi","imageUrl":"URL Gambar","department":"Departemen","isHighValue":"High Value","auditFrequency":"Audit","expiryDate":"Tgl Kadaluwarsa","isBatchTracked":"Lacak Batch","baseUnit":"Unit Dasar","displayUnit":"Unit Jual","conversionFactor":"Faktor Konversi","wasteThreshold":"Batas Perca"}}	3	2026-06-12 11:25:06.045546	2026-06-12 19:04:05.338532
3	CLOSING	1	[1,2]	1	APPROVED	{"shiftName":"SHIFT 1","userName":"Kasir 1","cashSystem":762000,"cashPhysical":262000,"discrepancy":-500000,"totalRevenue":302000,"paymentMethods":{"CASH":262000,"QRIS":40000,"TRANSFER":0,"MEMBER":0},"expenses":[],"netCashflow":302000,"stockAudit":[],"stockReportStatus":null}	3	2026-06-12 17:04:06.472712	2026-06-12 19:04:09.144719
4	DATA_EDIT	41	[1,2]	1	APPROVED	{"entityType":"INGREDIENT","itemName":"NASI GORENG JAWA","price":15000,"payload":{"name":"NASI GORENG JAWA","sku":"IG-040","category":"MINUMAN","unit":"Ml","costPrice":15000,"stockQuantity":99,"minStockLevel":10,"yieldPercentage":100,"description":"","imageUrl":"","department":"KITCHEN","isHighValue":false,"isMandatoryReporting":false,"auditFrequency":"SHIFT","expiryDate":null,"isBatchTracked":false,"baseUnit":"","displayUnit":"","conversionFactor":0,"wasteThreshold":0},"changes":{"department":{"old":"CASHIER","new":"KITCHEN"}},"fieldLabels":{"name":"Nama","sku":"SKU","category":"Kategori","unit":"Satuan","costPrice":"Harga Beli","stockQuantity":"Stok Saat Ini","minStockLevel":"Batas Minimum","yieldPercentage":"% Yield","description":"Deskripsi","imageUrl":"URL Gambar","department":"Departemen","isHighValue":"High Value","auditFrequency":"Audit","expiryDate":"Tgl Kadaluwarsa","isBatchTracked":"Lacak Batch","baseUnit":"Unit Dasar","displayUnit":"Unit Jual","conversionFactor":"Faktor Konversi","wasteThreshold":"Batas Perca"}}	4	2026-06-12 19:23:25.99454	2026-06-12 19:36:37.376889
1	DATA_EDIT	8	[1,2]	1	APPROVED	{"entityType":"INGREDIENT","itemName":"RICH CHOCO","price":15000,"payload":{"name":"RICH CHOCO","sku":"IG-008","category":"MINUMAN","unit":"Pcs","costPrice":15000,"stockQuantity":58,"minStockLevel":10,"yieldPercentage":100,"description":"","imageUrl":"","department":"BAR","isHighValue":false,"isMandatoryReporting":false,"auditFrequency":"SHIFT","expiryDate":null,"isBatchTracked":false,"baseUnit":"","displayUnit":"","conversionFactor":0,"wasteThreshold":0},"changes":{"unit":{"old":"Gram","new":"Pcs"}},"fieldLabels":{"name":"Nama","sku":"SKU","category":"Kategori","unit":"Satuan","costPrice":"Harga Beli","stockQuantity":"Stok Saat Ini","minStockLevel":"Batas Minimum","yieldPercentage":"% Yield","description":"Deskripsi","imageUrl":"URL Gambar","department":"Departemen","isHighValue":"High Value","auditFrequency":"Audit","expiryDate":"Tgl Kadaluwarsa","isBatchTracked":"Lacak Batch","baseUnit":"Unit Dasar","displayUnit":"Unit Jual","conversionFactor":"Faktor Konversi","wasteThreshold":"Batas Perca"}}	3	2026-06-12 11:23:05.532718	2026-06-12 19:04:13.443219
5	CLOSING	2	[1,2]	1	APPROVED	{"shiftName":"SHIFT 2","userName":"Kasir 2","cashSystem":1601500,"cashPhysical":1601500,"discrepancy":0,"totalRevenue":1352000,"paymentMethods":{"CASH":1101500,"QRIS":250500,"TRANSFER":0,"MEMBER":0},"expenses":[],"netCashflow":1352000,"stockAudit":[],"stockReportStatus":null}	4	2026-06-13 03:30:07.324224	2026-06-13 03:41:50.90799
7	DATA_EDIT	2	[1,2]	1	APPROVED	{"entityType":"MENU_ITEM","itemName":"RICH CHOCO","price":1,"payload":{"name":"RICH CHOCO","sku":"MNU-1781297810483","categoryId":4,"productionTarget":"","expiryDate":null,"price":0,"taxPercentage":0,"stockQuantity":55,"minStockLevel":2,"description":"","imageUrl":"","productFinance":{"id":2,"menuItemId":2,"baseHpp":"0.00","targetMarginPercent":0,"targetMarkupFixed":"0.00","targetMarkupPercent":"0.00","targetMultiplier":"3.00","maxHppThreshold":"35.00","pricingAdvice":"","createdAt":"2026-06-12T20:56:50.482Z","updatedAt":"2026-06-12T20:56:56.564Z"},"department":"CASHIER","isHighValue":false,"isMandatoryReporting":false,"auditFrequency":"SHIFT"},"changes":{"price":{"old":1,"new":0}},"fieldLabels":{"name":"Nama Menu","sku":"SKU / Kode","price":"Harga Jual","taxPercentage":"Pajak (%)","stockQuantity":"Stok Tersedia","minStockLevel":"Min. Stock Alert","department":"Departemen","isActive":"Status Aktif","description":"Deskripsi","imageUrl":"URL Foto","yieldPercentage":"Yield (%)","categoryId":"Kategori ID","expiryDate":"Tgl Kadaluwarsa"}}	1	2026-06-13 03:57:35.508133	2026-06-13 03:57:54.057707
6	DATA_EDIT	1	[1,2]	1	APPROVED	{"entityType":"MENU_ITEM","itemName":"REDVALVET","price":1,"payload":{"name":"REDVALVET","sku":"MNU-1781297746738","categoryId":4,"productionTarget":"","expiryDate":null,"price":0,"taxPercentage":0,"stockQuantity":64,"minStockLevel":2,"description":"","imageUrl":"","productFinance":{"id":1,"menuItemId":1,"baseHpp":"0.00","targetMarginPercent":0,"targetMarkupFixed":"0.00","targetMarkupPercent":"0.00","targetMultiplier":"3.00","maxHppThreshold":"35.00","pricingAdvice":"","createdAt":"2026-06-12T20:55:46.737Z","updatedAt":"2026-06-12T20:55:54.753Z"},"department":"CASHIER","isHighValue":false,"isMandatoryReporting":false,"auditFrequency":"SHIFT"},"changes":{"price":{"old":1,"new":0}},"fieldLabels":{"name":"Nama Menu","sku":"SKU / Kode","price":"Harga Jual","taxPercentage":"Pajak (%)","stockQuantity":"Stok Tersedia","minStockLevel":"Min. Stock Alert","department":"Departemen","isActive":"Status Aktif","description":"Deskripsi","imageUrl":"URL Foto","yieldPercentage":"Yield (%)","categoryId":"Kategori ID","expiryDate":"Tgl Kadaluwarsa"}}	1	2026-06-13 03:57:22.224368	2026-06-13 03:57:58.430462
10	DATA_EDIT	58	[1,2]	1	APPROVED	{"entityType":"INGREDIENT","itemName":"CAPUCINO","price":0,"payload":{"name":"CAPPUCINO","sku":"IG-009","category":"Packaging","unit":"Gram","costPrice":0,"stockQuantity":54,"minStockLevel":2,"yieldPercentage":100,"description":"","imageUrl":"","department":"CASHIER","isHighValue":false,"isMandatoryReporting":false,"auditFrequency":"SHIFT","expiryDate":null,"isBatchTracked":false,"baseUnit":"","displayUnit":"","conversionFactor":0,"wasteThreshold":0},"changes":{"name":{"old":"CAPUCINO","new":"CAPPUCINO"}},"fieldLabels":{"name":"Nama","sku":"SKU","category":"Kategori","unit":"Satuan","costPrice":"Harga Beli","stockQuantity":"Stok Saat Ini","minStockLevel":"Batas Minimum","yieldPercentage":"% Yield","description":"Deskripsi","imageUrl":"URL Gambar","department":"Departemen","isHighValue":"High Value","auditFrequency":"Audit","expiryDate":"Tgl Kadaluwarsa","isBatchTracked":"Lacak Batch","baseUnit":"Unit Dasar","displayUnit":"Unit Jual","conversionFactor":"Faktor Konversi","wasteThreshold":"Batas Perca"}}	1	2026-06-13 04:06:44.936444	2026-06-13 04:06:58.999151
9	DATA_EDIT	1	[1,2]	1	APPROVED	{"entityType":"MENU_ITEM","itemName":"REDVALVET","price":0,"payload":{"name":"REDVALVET","sku":"MNU-1781297746738","categoryId":4,"productionTarget":"","expiryDate":null,"price":1,"taxPercentage":0,"stockQuantity":64,"minStockLevel":2,"description":"","imageUrl":"","productFinance":{"id":1,"menuItemId":1,"baseHpp":"0.00","targetMarginPercent":100,"targetMarkupFixed":"0.00","targetMarkupPercent":"0.00","targetMultiplier":"3.00","maxHppThreshold":"35.00","pricingAdvice":"","createdAt":"2026-06-12T20:55:46.737Z","updatedAt":"2026-06-12T20:57:58.489Z"},"department":"CASHIER","isHighValue":false,"isMandatoryReporting":false,"auditFrequency":"SHIFT"},"changes":{"price":{"old":0,"new":1}},"fieldLabels":{"name":"Nama Menu","sku":"SKU / Kode","price":"Harga Jual","taxPercentage":"Pajak (%)","stockQuantity":"Stok Tersedia","minStockLevel":"Min. Stock Alert","department":"Departemen","isActive":"Status Aktif","description":"Deskripsi","imageUrl":"URL Foto","yieldPercentage":"Yield (%)","categoryId":"Kategori ID","expiryDate":"Tgl Kadaluwarsa"}}	1	2026-06-13 03:58:11.216149	2026-06-13 03:58:18.326244
8	DATA_EDIT	2	[1,2]	1	APPROVED	{"entityType":"MENU_ITEM","itemName":"RICH CHOCO","price":0,"payload":{"name":"RICH CHOCO","sku":"MNU-1781297810483","categoryId":4,"productionTarget":"","expiryDate":null,"price":1,"taxPercentage":0,"stockQuantity":55,"minStockLevel":2,"description":"","imageUrl":"","productFinance":{"id":2,"menuItemId":2,"baseHpp":"0.00","targetMarginPercent":100,"targetMarkupFixed":"0.00","targetMarkupPercent":"0.00","targetMultiplier":"3.00","maxHppThreshold":"35.00","pricingAdvice":"","createdAt":"2026-06-12T20:56:50.482Z","updatedAt":"2026-06-12T20:57:54.136Z"},"department":"CASHIER","isHighValue":false,"isMandatoryReporting":false,"auditFrequency":"SHIFT"},"changes":{"price":{"old":0,"new":1}},"fieldLabels":{"name":"Nama Menu","sku":"SKU / Kode","price":"Harga Jual","taxPercentage":"Pajak (%)","stockQuantity":"Stok Tersedia","minStockLevel":"Min. Stock Alert","department":"Departemen","isActive":"Status Aktif","description":"Deskripsi","imageUrl":"URL Foto","yieldPercentage":"Yield (%)","categoryId":"Kategori ID","expiryDate":"Tgl Kadaluwarsa"}}	1	2026-06-13 03:58:05.362669	2026-06-13 03:58:20.905391
\.


--
-- Data for Name: asset_categories; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.asset_categories (id, name, description, "assetType", "isActive", "createdAt", "updatedAt") FROM stdin;
1	VVIP	MEJA VVIP BILLIARD	BILLIARD	t	2026-06-12 02:46:10.44855	2026-06-12 02:46:10.44855
2	VIP	MEJA BILLIARD VIP	BILLIARD	t	2026-06-12 02:49:35.7393	2026-06-12 02:49:35.7393
3	REGULER	MEJA BILLIARD REGULER	BILLIARD	t	2026-06-12 02:49:47.950032	2026-06-12 02:49:47.950032
\.


--
-- Data for Name: attendances; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.attendances (id, "userId", date, "checkInTime", "checkOutTime", "workDurationMinutes", status, "isApproved", "approvedBy", "approvedAt", "overtimeMinutes", "isManual", "shiftName", note, "createdAt", "updatedAt", "payrollReleaseId") FROM stdin;
1	2	2026-06-11	\N	\N	\N	ALPHA	t	SYSTEM_CRON	2026-06-12 04:00:00.323	0	f	\N	Otomatis: Tidak ada rekaman absensi (OVERTIME)	2026-06-12 04:00:00.32408	2026-06-12 04:00:00.32408	\N
3	4	2026-06-11	\N	\N	\N	ALPHA	t	SYSTEM_CRON	2026-06-12 04:00:00.987	0	f	\N	Otomatis: Tidak ada rekaman absensi (SHIFT 2)	2026-06-12 04:00:00.987853	2026-06-12 04:00:00.987853	\N
5	3	2026-06-11	\N	\N	\N	ALPHA	t	SYSTEM_CRON	2026-06-12 04:00:01.065	0	f	\N	Otomatis: Tidak ada rekaman absensi (SHIFT 1)	2026-06-12 04:00:01.066481	2026-06-12 04:00:01.066481	\N
7	1	2026-06-11	\N	\N	\N	ALPHA	t	SYSTEM_CRON	2026-06-12 04:00:01.138	0	f	\N	Otomatis: Tidak ada rekaman absensi	2026-06-12 04:00:01.138897	2026-06-12 04:00:01.138897	\N
9	5	2026-06-11	\N	\N	\N	ALPHA	t	SYSTEM_CRON	2026-06-12 04:00:01.221	0	f	\N	Otomatis: Tidak ada rekaman absensi	2026-06-12 04:00:01.221483	2026-06-12 04:00:01.221483	\N
11	2	2026-06-12	\N	\N	\N	ALPHA	t	SYSTEM_CRON	2026-06-13 04:00:01.192	0	f	\N	Otomatis: Tidak ada rekaman absensi (OVERTIME)	2026-06-13 04:00:01.204557	2026-06-13 04:00:01.204557	\N
13	4	2026-06-12	\N	\N	\N	ALPHA	t	SYSTEM_CRON	2026-06-13 04:00:01.574	0	f	\N	Otomatis: Tidak ada rekaman absensi (SHIFT 2)	2026-06-13 04:00:01.575273	2026-06-13 04:00:01.575273	\N
15	3	2026-06-12	\N	\N	\N	ALPHA	t	SYSTEM_CRON	2026-06-13 04:00:01.834	0	f	\N	Otomatis: Tidak ada rekaman absensi (SHIFT 1)	2026-06-13 04:00:01.835558	2026-06-13 04:00:01.835558	\N
17	5	2026-06-12	\N	\N	\N	ALPHA	t	SYSTEM_CRON	2026-06-13 04:00:02.162	0	f	\N	Otomatis: Tidak ada rekaman absensi	2026-06-13 04:00:02.163561	2026-06-13 04:00:02.163561	\N
19	1	2026-06-12	\N	\N	\N	ALPHA	t	SYSTEM_CRON	2026-06-13 04:00:02.538	0	f	\N	Otomatis: Tidak ada rekaman absensi	2026-06-13 04:00:02.539567	2026-06-13 04:00:02.539567	\N
\.


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.audit_logs (id, action, "user", details, "tableId", "invoiceNumber", "createdAt") FROM stdin;
1	UPDATE_SETTINGS	admin	Ubah pengaturan: bounceBackConfig: [{"tierName":"Tier 1 - Pelanggan Reguler","minAmount":50000,"maxAmount":100000,"rewardType":"FREE_ITEM","rewardValue":1,"minClaimTransaction":0,"expiryDays":7},{"tierName":"Tier 2 - Pelanggan Setia","minAmount":100001,"maxAmount":250000,"rewardType":"DISCOUNT_FIXED","rewardValue":15000,"minClaimTransaction":50000,"expiryDays":14},{"tierName":"Tier 3 - Pelanggan VIP","minAmount":250001,"maxAmount":99999999,"rewardType":"FREE_BILLIARD_MINUTES","rewardValue":60,"minClaimTransaction":0,"expiryDays":30}] -> [{"tierName":"Tier 1 - Pelanggan Reguler","minAmount":50000,"maxAmount":100000,"rewardType":"FREE_ITEM","rewardValue":1,"minClaimTransaction":0,"expiryDays":7},{"tierName":"Tier 2 - Pelanggan Setia","minAmount":100001,"maxAmount":250000,"rewardType":"DISCOUNT_FIXED","rewardValue":15000,"minClaimTransaction":50000,"expiryDays":14},{"tierName":"Tier 3 - Pelanggan VIP","minAmount":250001,"maxAmount":99999999,"rewardType":"FREE_BILLIARD_MINUTES","rewardValue":60,"minClaimTransaction":0,"expiryDays":30}], businessName: "My Billiard & Cafe" -> "SCUFF BILLIARD"	\N	\N	2026-06-12 02:34:52.128681
2	UPDATE_SETTINGS	admin	Ubah pengaturan: address: null -> " Tulangan Tengah, Tulangan, Kec. Tulangan, Kabupaten Sidoarjo", contact: null -> "0851-1770-5709", socialMediaLink: null -> "@scuffbilliard", bounceBackConfig: [{"tierName":"Tier 1 - Pelanggan Reguler","minAmount":50000,"maxAmount":100000,"rewardType":"FREE_ITEM","rewardValue":1,"minClaimTransaction":0,"expiryDays":7},{"tierName":"Tier 2 - Pelanggan Setia","minAmount":100001,"maxAmount":250000,"rewardType":"DISCOUNT_FIXED","rewardValue":15000,"minClaimTransaction":50000,"expiryDays":14},{"tierName":"Tier 3 - Pelanggan VIP","minAmount":250001,"maxAmount":99999999,"rewardType":"FREE_BILLIARD_MINUTES","rewardValue":60,"minClaimTransaction":0,"expiryDays":30}] -> [{"tierName":"Tier 1 - Pelanggan Reguler","minAmount":50000,"maxAmount":100000,"rewardType":"FREE_ITEM","rewardValue":1,"minClaimTransaction":0,"expiryDays":7},{"tierName":"Tier 2 - Pelanggan Setia","minAmount":100001,"maxAmount":250000,"rewardType":"DISCOUNT_FIXED","rewardValue":15000,"minClaimTransaction":50000,"expiryDays":14},{"tierName":"Tier 3 - Pelanggan VIP","minAmount":250001,"maxAmount":99999999,"rewardType":"FREE_BILLIARD_MINUTES","rewardValue":60,"minClaimTransaction":0,"expiryDays":30}]	\N	\N	2026-06-12 02:36:58.579791
3	UPDATE_SETTINGS	admin	Ubah pengaturan: logoPath: null -> "/uploads/logos/logo-1781206637608-970143562.jpeg", bounceBackConfig: [{"tierName":"Tier 1 - Pelanggan Reguler","minAmount":50000,"maxAmount":100000,"rewardType":"FREE_ITEM","rewardValue":1,"minClaimTransaction":0,"expiryDays":7},{"tierName":"Tier 2 - Pelanggan Setia","minAmount":100001,"maxAmount":250000,"rewardType":"DISCOUNT_FIXED","rewardValue":15000,"minClaimTransaction":50000,"expiryDays":14},{"tierName":"Tier 3 - Pelanggan VIP","minAmount":250001,"maxAmount":99999999,"rewardType":"FREE_BILLIARD_MINUTES","rewardValue":60,"minClaimTransaction":0,"expiryDays":30}] -> [{"tierName":"Tier 1 - Pelanggan Reguler","minAmount":50000,"maxAmount":100000,"rewardType":"FREE_ITEM","rewardValue":1,"minClaimTransaction":0,"expiryDays":7},{"tierName":"Tier 2 - Pelanggan Setia","minAmount":100001,"maxAmount":250000,"rewardType":"DISCOUNT_FIXED","rewardValue":15000,"minClaimTransaction":50000,"expiryDays":14},{"tierName":"Tier 3 - Pelanggan VIP","minAmount":250001,"maxAmount":99999999,"rewardType":"FREE_BILLIARD_MINUTES","rewardValue":60,"minClaimTransaction":0,"expiryDays":30}]	\N	\N	2026-06-12 02:37:22.066142
4	UPDATE_SETTINGS	admin	Ubah pengaturan: invoiceFooterNote: null -> "Periksa kembali nota anda, kami tidak menerima komplain \\nsaat anda meningalkan area ini", bounceBackConfig: [{"tierName":"Tier 1 - Pelanggan Reguler","minAmount":50000,"maxAmount":100000,"rewardType":"FREE_ITEM","rewardValue":1,"minClaimTransaction":0,"expiryDays":7},{"tierName":"Tier 2 - Pelanggan Setia","minAmount":100001,"maxAmount":250000,"rewardType":"DISCOUNT_FIXED","rewardValue":15000,"minClaimTransaction":50000,"expiryDays":14},{"tierName":"Tier 3 - Pelanggan VIP","minAmount":250001,"maxAmount":99999999,"rewardType":"FREE_BILLIARD_MINUTES","rewardValue":60,"minClaimTransaction":0,"expiryDays":30}] -> [{"tierName":"Tier 1 - Pelanggan Reguler","minAmount":50000,"maxAmount":100000,"rewardType":"FREE_ITEM","rewardValue":1,"minClaimTransaction":0,"expiryDays":7},{"tierName":"Tier 2 - Pelanggan Setia","minAmount":100001,"maxAmount":250000,"rewardType":"DISCOUNT_FIXED","rewardValue":15000,"minClaimTransaction":50000,"expiryDays":14},{"tierName":"Tier 3 - Pelanggan VIP","minAmount":250001,"maxAmount":99999999,"rewardType":"FREE_BILLIARD_MINUTES","rewardValue":60,"minClaimTransaction":0,"expiryDays":30}]	\N	\N	2026-06-12 02:40:26.972612
5	UPDATE_SETTINGS	admin	Ubah pengaturan: availablePaymentMethods: null -> ["CASH","Qris","TRANSFER","GoPay","DANA","OVO","BCA","MANDIRI","BRI","BNI","SEABANK","SHOPEEPAY"], bounceBackConfig: [{"tierName":"Tier 1 - Pelanggan Reguler","minAmount":50000,"maxAmount":100000,"rewardType":"FREE_ITEM","rewardValue":1,"minClaimTransaction":0,"expiryDays":7},{"tierName":"Tier 2 - Pelanggan Setia","minAmount":100001,"maxAmount":250000,"rewardType":"DISCOUNT_FIXED","rewardValue":15000,"minClaimTransaction":50000,"expiryDays":14},{"tierName":"Tier 3 - Pelanggan VIP","minAmount":250001,"maxAmount":99999999,"rewardType":"FREE_BILLIARD_MINUTES","rewardValue":60,"minClaimTransaction":0,"expiryDays":30}] -> [{"tierName":"Tier 1 - Pelanggan Reguler","minAmount":50000,"maxAmount":100000,"rewardType":"FREE_ITEM","rewardValue":1,"minClaimTransaction":0,"expiryDays":7},{"tierName":"Tier 2 - Pelanggan Setia","minAmount":100001,"maxAmount":250000,"rewardType":"DISCOUNT_FIXED","rewardValue":15000,"minClaimTransaction":50000,"expiryDays":14},{"tierName":"Tier 3 - Pelanggan VIP","minAmount":250001,"maxAmount":99999999,"rewardType":"FREE_BILLIARD_MINUTES","rewardValue":60,"minClaimTransaction":0,"expiryDays":30}]	\N	\N	2026-06-12 02:41:58.108458
6	UPDATE_SETTINGS	admin	Ubah pengaturan: availablePaymentMethods: ["CASH","Qris","TRANSFER","GoPay","DANA","OVO","BCA","MANDIRI","BRI","BNI","SEABANK","SHOPEEPAY"] -> ["CASH","Qris","TRANSFER","GoPay","DANA","OVO","BCA","MANDIRI","BRI","BNI","SEABANK","SHOPEEPAY"], availableShifts: null -> [{"name":"SHIFT 1","startTime":"10:00","endTime":"18:00"},{"name":"SHIFT 2","startTime":"18:00","endTime":"02:00"},{"name":"OVERTIME","startTime":"02:00","endTime":"10:00"}], bounceBackConfig: [{"tierName":"Tier 1 - Pelanggan Reguler","minAmount":50000,"maxAmount":100000,"rewardType":"FREE_ITEM","rewardValue":1,"minClaimTransaction":0,"expiryDays":7},{"tierName":"Tier 2 - Pelanggan Setia","minAmount":100001,"maxAmount":250000,"rewardType":"DISCOUNT_FIXED","rewardValue":15000,"minClaimTransaction":50000,"expiryDays":14},{"tierName":"Tier 3 - Pelanggan VIP","minAmount":250001,"maxAmount":99999999,"rewardType":"FREE_BILLIARD_MINUTES","rewardValue":60,"minClaimTransaction":0,"expiryDays":30}] -> [{"tierName":"Tier 1 - Pelanggan Reguler","minAmount":50000,"maxAmount":100000,"rewardType":"FREE_ITEM","rewardValue":1,"minClaimTransaction":0,"expiryDays":7},{"tierName":"Tier 2 - Pelanggan Setia","minAmount":100001,"maxAmount":250000,"rewardType":"DISCOUNT_FIXED","rewardValue":15000,"minClaimTransaction":50000,"expiryDays":14},{"tierName":"Tier 3 - Pelanggan VIP","minAmount":250001,"maxAmount":99999999,"rewardType":"FREE_BILLIARD_MINUTES","rewardValue":60,"minClaimTransaction":0,"expiryDays":30}], businessDayOffset: "00:00" -> "03:00", autoSettlementEnabled: false -> true	\N	\N	2026-06-12 02:44:38.269464
31	STOP_SESSION	Sistem (Auto-Cutoff Prepaid)	Stop sesi meja MEJA 5. Durasi: 120 menit. Total Billiard: Rp 40,000 | Cafe: Rp 0 | SC: Rp 0 | PPN: Rp 0 | Grand Total: Rp 40,000	5	\N	2026-06-12 13:26:49.170178
32	BILLIARD_PRICE_OVERRIDE	kasir1	Ubah harga billiard manual dari Rp 20,000 ke Rp 44,000	7	TAB-260612113911	2026-06-12 13:50:38.81241
7	UPDATE_SETTINGS	admin	Ubah pengaturan: availablePaymentMethods: ["CASH","Qris","TRANSFER","GoPay","DANA","OVO","BCA","MANDIRI","BRI","BNI","SEABANK","SHOPEEPAY"] -> ["CASH","Qris","TRANSFER","GoPay","DANA","OVO","BCA","MANDIRI","BRI","BNI","SEABANK","SHOPEEPAY"], availableShifts: [{"name":"SHIFT 1","startTime":"10:00","endTime":"18:00"},{"name":"SHIFT 2","startTime":"18:00","endTime":"02:00"},{"name":"OVERTIME","startTime":"02:00","endTime":"10:00"}] -> [{"name":"SHIFT 1","startTime":"10:00","endTime":"18:00"},{"name":"SHIFT 2","startTime":"18:00","endTime":"02:00"},{"name":"OVERTIME","startTime":"02:00","endTime":"10:00"}], bounceBackConfig: [{"tierName":"Tier 1 - Pelanggan Reguler","minAmount":50000,"maxAmount":100000,"rewardType":"FREE_ITEM","rewardValue":1,"minClaimTransaction":0,"expiryDays":7},{"tierName":"Tier 2 - Pelanggan Setia","minAmount":100001,"maxAmount":250000,"rewardType":"DISCOUNT_FIXED","rewardValue":15000,"minClaimTransaction":50000,"expiryDays":14},{"tierName":"Tier 3 - Pelanggan VIP","minAmount":250001,"maxAmount":99999999,"rewardType":"FREE_BILLIARD_MINUTES","rewardValue":60,"minClaimTransaction":0,"expiryDays":30}] -> [{"tierName":"Tier 1 - Pelanggan Reguler","minAmount":50000,"maxAmount":100000,"rewardType":"FREE_ITEM","rewardValue":1,"minClaimTransaction":0,"expiryDays":7},{"tierName":"Tier 2 - Pelanggan Setia","minAmount":100001,"maxAmount":250000,"rewardType":"DISCOUNT_FIXED","rewardValue":15000,"minClaimTransaction":50000,"expiryDays":14},{"tierName":"Tier 3 - Pelanggan VIP","minAmount":250001,"maxAmount":99999999,"rewardType":"FREE_BILLIARD_MINUTES","rewardValue":60,"minClaimTransaction":0,"expiryDays":30}]	\N	\N	2026-06-12 02:45:16.089934
8	UPDATE_SETTINGS	admin	Ubah pengaturan: customPricingDynamic: null -> [{"categoryId":1,"basePrice":0,"timeSlots":[{"start":"10:00","end":"18:00","price":35000},{"start":"18:00","end":"02:00","price":"40000"},{"start":"02:00","end":"10:00","price":"40000"}]}]	\N	\N	2026-06-12 02:51:15.497828
9	UPDATE_SETTINGS	admin	Ubah pengaturan: customPricingDynamic: [{"categoryId":1,"basePrice":0,"timeSlots":[{"start":"10:00","end":"18:00","price":35000},{"start":"18:00","end":"02:00","price":"40000"},{"start":"02:00","end":"10:00","price":"40000"}]}] -> [{"categoryId":1,"basePrice":0,"timeSlots":[{"start":"10:00","end":"18:00","price":35000},{"start":"18:00","end":"02:00","price":"40000"},{"start":"02:00","end":"10:00","price":"40000"}]},{"categoryId":2,"basePrice":0,"timeSlots":[{"start":"10:00","end":"18:00","price":"25000"},{"start":"18:00","end":"02:00","price":"30000"},{"start":"02:00","end":"10:00","price":"30000"}]}]	\N	\N	2026-06-12 02:51:49.703706
10	UPDATE_SETTINGS	admin	Ubah pengaturan: customPricingDynamic: [{"categoryId":1,"basePrice":0,"timeSlots":[{"start":"10:00","end":"18:00","price":35000},{"start":"18:00","end":"02:00","price":"40000"},{"start":"02:00","end":"10:00","price":"40000"}]},{"categoryId":2,"basePrice":0,"timeSlots":[{"start":"10:00","end":"18:00","price":"25000"},{"start":"18:00","end":"02:00","price":"30000"},{"start":"02:00","end":"10:00","price":"30000"}]}] -> [{"categoryId":1,"basePrice":0,"timeSlots":[{"start":"10:00","end":"18:00","price":35000},{"start":"18:00","end":"02:00","price":"40000"},{"start":"02:00","end":"10:00","price":"40000"}]},{"categoryId":2,"basePrice":0,"timeSlots":[{"start":"10:00","end":"18:00","price":"25000"},{"start":"18:00","end":"02:00","price":"30000"},{"start":"02:00","end":"10:00","price":"30000"}]},{"categoryId":3,"basePrice":0,"timeSlots":[{"start":"10:00","end":"18:00","price":"20000"},{"start":"18:00","end":"02:00","price":"25000"},{"start":"02:00","end":"10:00","price":"25000"}]}]	\N	\N	2026-06-12 02:52:19.524678
11	UPDATE_SETTINGS	admin	Ubah pengaturan: bounceBackConfig: [{"tierName":"Tier 1 - Pelanggan Reguler","minAmount":50000,"maxAmount":100000,"rewardType":"FREE_ITEM","rewardValue":1,"minClaimTransaction":0,"expiryDays":7},{"tierName":"Tier 2 - Pelanggan Setia","minAmount":100001,"maxAmount":250000,"rewardType":"DISCOUNT_FIXED","rewardValue":15000,"minClaimTransaction":50000,"expiryDays":14},{"tierName":"Tier 3 - Pelanggan VIP","minAmount":250001,"maxAmount":99999999,"rewardType":"FREE_BILLIARD_MINUTES","rewardValue":60,"minClaimTransaction":0,"expiryDays":30}] -> [{"tierName":"Tier 1 - Pelanggan Reguler","minAmount":5000000,"maxAmount":100000,"rewardType":"FREE_ITEM","rewardValue":1,"minClaimTransaction":0,"expiryDays":7},{"tierName":"Tier 2 - Pelanggan Setia","minAmount":10000000,"maxAmount":250000,"rewardType":"DISCOUNT_FIXED","rewardValue":15000,"minClaimTransaction":50000,"expiryDays":14},{"tierName":"Tier 3 - Pelanggan VIP","minAmount":20000000,"maxAmount":99999999,"rewardType":"FREE_BILLIARD_MINUTES","rewardValue":60,"minClaimTransaction":0,"expiryDays":30}]	\N	\N	2026-06-12 03:17:12.290936
12	UPDATE_SETTINGS	scuff	Ubah pengaturan: availablePaymentMethods: ["CASH","Qris","TRANSFER","GoPay","DANA","OVO","BCA","MANDIRI","BRI","BNI","SEABANK","SHOPEEPAY"] -> ["CASH","Qris","TRANSFER","GoPay","DANA","OVO","BCA","MANDIRI","BRI","BNI","SEABANK","SHOPEEPAY"], customPricingDynamic: [{"categoryId":1,"basePrice":0,"timeSlots":[{"start":"10:00","end":"18:00","price":35000},{"start":"18:00","end":"02:00","price":"40000"},{"start":"02:00","end":"10:00","price":"40000"}]},{"categoryId":2,"basePrice":0,"timeSlots":[{"start":"10:00","end":"18:00","price":"25000"},{"start":"18:00","end":"02:00","price":"30000"},{"start":"02:00","end":"10:00","price":"30000"}]},{"categoryId":3,"basePrice":0,"timeSlots":[{"start":"10:00","end":"18:00","price":"20000"},{"start":"18:00","end":"02:00","price":"25000"},{"start":"02:00","end":"10:00","price":"25000"}]}] -> [{"categoryId":1,"basePrice":0,"timeSlots":[{"start":"10:00","end":"18:00","price":35000},{"start":"18:00","end":"02:00","price":"40000"},{"start":"02:00","end":"10:00","price":"40000"}]},{"categoryId":2,"basePrice":0,"timeSlots":[{"start":"10:00","end":"18:00","price":"25000"},{"start":"18:00","end":"02:00","price":"30000"},{"start":"02:00","end":"10:00","price":"30000"}]},{"categoryId":3,"basePrice":0,"timeSlots":[{"start":"10:00","end":"18:00","price":"20000"},{"start":"18:00","end":"02:00","price":"25000"},{"start":"02:00","end":"10:00","price":"25000"}]}], availableShifts: [{"name":"SHIFT 1","startTime":"10:00","endTime":"18:00"},{"name":"SHIFT 2","startTime":"18:00","endTime":"02:00"},{"name":"OVERTIME","startTime":"02:00","endTime":"10:00"}] -> [{"name":"SHIFT 1","startTime":"10:00","endTime":"18:00"},{"name":"SHIFT 2","startTime":"18:00","endTime":"02:00"},{"name":"OVERTIME","startTime":"02:00","endTime":"10:00"}], approvalConfig: null -> {"WASTE":[1,2],"EXPENSE":[1,2],"STOCK_UPDATE":[1,2],"PENALTY":[1,2],"CLOSING":[1,2],"DATA_EDIT":[1,2]}, bounceBackConfig: [{"tierName":"Tier 1 - Pelanggan Reguler","minAmount":5000000,"maxAmount":100000,"rewardType":"FREE_ITEM","rewardValue":1,"minClaimTransaction":0,"expiryDays":7},{"tierName":"Tier 2 - Pelanggan Setia","minAmount":10000000,"maxAmount":250000,"rewardType":"DISCOUNT_FIXED","rewardValue":15000,"minClaimTransaction":50000,"expiryDays":14},{"tierName":"Tier 3 - Pelanggan VIP","minAmount":20000000,"maxAmount":99999999,"rewardType":"FREE_BILLIARD_MINUTES","rewardValue":60,"minClaimTransaction":0,"expiryDays":30}] -> [{"tierName":"Tier 1 - Pelanggan Reguler","minAmount":5000000,"maxAmount":100000,"rewardType":"FREE_ITEM","rewardValue":1,"minClaimTransaction":0,"expiryDays":7},{"tierName":"Tier 2 - Pelanggan Setia","minAmount":10000000,"maxAmount":250000,"rewardType":"DISCOUNT_FIXED","rewardValue":15000,"minClaimTransaction":50000,"expiryDays":14},{"tierName":"Tier 3 - Pelanggan VIP","minAmount":20000000,"maxAmount":99999999,"rewardType":"FREE_BILLIARD_MINUTES","rewardValue":60,"minClaimTransaction":0,"expiryDays":30}]	\N	\N	2026-06-12 03:37:15.519937
13	WAIT_LIST_CREATE	Sistem	Antrean [CAFE] dibuat untuk ade	\N	\N	2026-06-12 04:21:06.81045
14	WAIT_LIST_KEEP	scuff	Antrean [CAFE] ade dikeep oleh scuff	\N	\N	2026-06-12 04:21:13.970963
15	WAIT_LIST_UNKEEP	scuff	Antrean [CAFE] ade dilepas (unkeep) oleh scuff	\N	\N	2026-06-12 05:24:31.984556
16	WAIT_LIST_CANCEL	scuff	Antrean [CAFE] ade dibatalkan oleh scuff	\N	\N	2026-06-12 05:24:34.031036
17	START_SESSION	kasir1	Mulai meja MEJA 1 (OPEN TABLE WEEKDAYS) - Tamu: gilang	1	\N	2026-06-12 10:12:57.604762
18	START_SESSION	kasir1	Mulai meja MEJA 6 (1 JAM WEEKDAYS) - Tamu: kacong	6	\N	2026-06-12 11:05:48.78095
19	BILLIARD_PRICE_OVERRIDE	kasir1	Ubah harga billiard manual dari Rp 20,000 ke Rp 40,000	6	TAB-260612110548	2026-06-12 11:06:03.90044
20	EXTEND_SESSION	kasir1	Tambah waktu meja MEJA 6 selama 60 menit. Tambahan biaya: Rp 20,000	6	\N	2026-06-12 11:06:04.01227
21	START_SESSION	kasir1	Mulai meja MEJA 5 (1 JAM WEEKDAYS) - Tamu: JEFRI	5	\N	2026-06-12 11:26:49.038969
22	BILLIARD_PRICE_OVERRIDE	kasir1	Ubah harga billiard manual dari Rp 40,000 ke Rp 60,000	6	TAB-260612110548	2026-06-12 11:27:03.61048
23	EXTEND_SESSION	kasir1	Tambah waktu meja MEJA 6 selama 60 menit. Tambahan biaya: Rp 20,000	6	\N	2026-06-12 11:27:03.741605
24	BILLIARD_PRICE_OVERRIDE	kasir1	Ubah harga billiard manual dari Rp 20,000 ke Rp 25,000	1	TAB-260612101257	2026-06-12 11:27:24.127472
25	STOP_SESSION	kasir1	Stop sesi meja MEJA 1. Durasi: 74 menit. Total Billiard: Rp 25,000 | Cafe: Rp 0 | SC: Rp 0 | PPN: Rp 0 | Grand Total: Rp 25,000	1	\N	2026-06-12 11:27:24.303162
26	BILLIARD_PRICE_OVERRIDE	kasir1	Ubah harga billiard manual dari Rp 20,000 ke Rp 40,000	5	TAB-260612112648	2026-06-12 11:30:26.721751
27	EXTEND_SESSION	kasir1	Tambah waktu meja MEJA 5 selama 60 menit. Tambahan biaya: Rp 20,000	5	\N	2026-06-12 11:30:26.861856
28	START_SESSION	kasir1	Mulai meja MEJA 7 (OPEN TABLE WEEKDAYS) - Tamu: NAFI	7	\N	2026-06-12 11:39:11.693498
29	START_SESSION	kasir1	Mulai meja MEJA 2 (1 JAM WEEKDAYS) - Tamu: SLIMIN	2	\N	2026-06-12 12:51:59.147045
30	START_SESSION	kasir1	Mulai meja MEJA 1 (3 JAM WEEKDAYS) - Tamu: DIAN	1	\N	2026-06-12 12:56:53.516146
33	STOP_SESSION	kasir1	Stop sesi meja MEJA 7. Durasi: 131 menit. Total Billiard: Rp 44,000 | Cafe: Rp 0 | SC: Rp 0 | PPN: Rp 0 | Grand Total: Rp 44,000	7	\N	2026-06-12 13:50:38.991169
34	STOP_SESSION	Sistem (Auto-Cutoff Prepaid)	Stop sesi meja MEJA 2. Durasi: 60 menit. Total Billiard: Rp 20,000 | Cafe: Rp 0 | SC: Rp 0 | PPN: Rp 0 | Grand Total: Rp 20,000	2	\N	2026-06-12 13:51:59.359012
35	START_SESSION	kasir1	Mulai meja MEJA 5 (1 JAM WEEKDAYS) - Tamu: FARIS	5	\N	2026-06-12 13:58:46.306882
36	BILLIARD_PRICE_OVERRIDE	kasir1	Ubah harga billiard manual dari Rp 20,000 ke Rp 40,000	5	TAB-260612135846	2026-06-12 13:59:41.331052
37	EXTEND_SESSION	kasir1	Tambah waktu meja MEJA 5 selama 60 menit. Tambahan biaya: Rp 20,000	5	\N	2026-06-12 13:59:41.453334
38	STOP_SESSION	Sistem (Auto-Cutoff Prepaid)	Stop sesi meja MEJA 6. Durasi: 180 menit. Total Billiard: Rp 60,000 | Cafe: Rp 0 | SC: Rp 0 | PPN: Rp 0 | Grand Total: Rp 60,000	6	\N	2026-06-12 14:05:48.91389
39	START_SESSION	kasir1	Mulai meja MEJA 6 (1 JAM WEEKDAYS) - Tamu: KACONG	6	\N	2026-06-12 14:11:02.795715
40	STOP_SESSION	Sistem (Auto-Cutoff Prepaid)	Stop sesi meja MEJA 6. Durasi: 60 menit. Total Billiard: Rp 20,000 | Cafe: Rp 0 | SC: Rp 0 | PPN: Rp 0 | Grand Total: Rp 20,000	6	\N	2026-06-12 15:11:03.02706
41	START_SESSION	kasir1	Mulai meja MEJA 9 (3 JAM WEEKEND) - Tamu: FIKRI	9	\N	2026-06-12 15:33:21.675497
42	STOP_SESSION	Sistem (Auto-Cutoff Prepaid)	Stop sesi meja MEJA 1. Durasi: 180 menit. Total Billiard: Rp 53,000 | Cafe: Rp 0 | SC: Rp 0 | PPN: Rp 0 | Grand Total: Rp 53,000	1	\N	2026-06-12 15:56:53.633871
43	STOP_SESSION	Sistem (Auto-Cutoff Prepaid)	Stop sesi meja MEJA 5. Durasi: 120 menit. Total Billiard: Rp 40,000 | Cafe: Rp 0 | SC: Rp 0 | PPN: Rp 0 | Grand Total: Rp 40,000	5	\N	2026-06-12 15:58:46.497529
44	START_SESSION	kasir1	Mulai meja MEJA 1 (1 JAM WEEKEND) - Tamu: SLIMIN	1	\N	2026-06-12 16:44:35.85502
45	START_SESSION	kasir1	Mulai meja MEJA 10 (1 JAM WEEKEND) - Tamu: ELIN	10	\N	2026-06-12 17:00:26.502328
46	BILLIARD_PRICE_OVERRIDE	kasir1	Ubah harga billiard manual dari Rp 35,000 ke Rp 70,000	10	TAB-260612170026	2026-06-12 17:00:44.008115
47	EXTEND_SESSION	kasir1	Tambah waktu meja MEJA 10 selama 60 menit. Tambahan biaya: Rp 35,000	10	\N	2026-06-12 17:00:44.101127
48	STOP_SESSION	Sistem (Auto-Cutoff Prepaid)	Stop sesi meja MEJA 1. Durasi: 60 menit. Total Billiard: Rp 20,000 | Cafe: Rp 0 | SC: Rp 0 | PPN: Rp 0 | Grand Total: Rp 20,000	1	\N	2026-06-12 17:44:36.074741
49	STOP_SESSION	Sistem (Auto-Cutoff Prepaid)	Stop sesi meja MEJA 9. Durasi: 180 menit. Total Billiard: Rp 70,000 | Cafe: Rp 0 | SC: Rp 0 | PPN: Rp 0 | Grand Total: Rp 70,000	9	\N	2026-06-12 18:33:21.803963
50	BILLIARD_PRICE_OVERRIDE	kasir2	Ubah harga billiard manual dari Rp 70,000 ke Rp 105,000	9	TAB-260612153321	2026-06-12 18:34:04.442621
51	EXTEND_SESSION	kasir2	Tambah waktu meja MEJA 9 selama 60 menit. Tambahan biaya: Rp 35,000	9	\N	2026-06-12 18:34:04.544106
52	START_SESSION	kasir2	Mulai meja MEJA 3 (3 JAM WEEKEND) - Tamu: zulva	3	\N	2026-06-12 18:53:32.370916
53	START_SESSION	kasir2	Mulai meja MEJA 12 (3 JAM WEEKEND) - Tamu: lana	12	\N	2026-06-12 18:56:43.108523
54	STOP_SESSION	Sistem (Auto-Cutoff Prepaid)	Stop sesi meja MEJA 10. Durasi: 120 menit. Total Billiard: Rp 70,000 | Cafe: Rp 0 | SC: Rp 0 | PPN: Rp 0 | Grand Total: Rp 70,000	10	\N	2026-06-12 19:00:26.596695
55	START_SESSION	kasir2	Mulai meja MEJA 6 (OPEN TABLE WEEKEND) - Tamu: niko	6	\N	2026-06-12 19:02:25.664473
56	MOVE_TABLE	kasir2	Move Table Billiard Meja MEJA 6 ke Meja MEJA 4. Total Rp 30,000	4	\N	2026-06-12 19:02:52.045216
57	START_SESSION	kasir2	Mulai meja MEJA 1 (OPEN TABLE WEEKEND) - Tamu: z	1	\N	2026-06-12 19:10:07.638122
58	START_SESSION	kasir2	Mulai meja MEJA 8 (OPEN TABLE WEEKEND) - Tamu: faris	8	\N	2026-06-12 19:11:29.360476
59	START_SESSION	kasir2	Mulai meja MEJA 10 (1 JAM WEEKEND) - Tamu: hasan	10	\N	2026-06-12 19:11:49.174257
60	BILLIARD_PRICE_OVERRIDE	kasir2	Ubah harga billiard manual dari Rp 35,000 ke Rp 70,000	10	TAB-260612191149	2026-06-12 19:11:54.489522
61	EXTEND_SESSION	kasir2	Tambah waktu meja MEJA 10 selama 60 menit. Tambahan biaya: Rp 35,000	10	\N	2026-06-12 19:11:54.564792
62	STOP_SESSION	Sistem (Auto-Cutoff Prepaid)	Stop sesi meja MEJA 9. Durasi: 241 menit. Total Billiard: Rp 105,000 | Cafe: Rp 0 | SC: Rp 0 | PPN: Rp 0 | Grand Total: Rp 105,000	9	\N	2026-06-12 19:34:04.684309
63	START_SESSION	kasir2	Mulai meja MEJA 2 (1 JAM WEEKEND) - Tamu: IQBAL	2	\N	2026-06-12 19:40:30.997675
64	BILLIARD_PRICE_OVERRIDE	kasir2	Ubah harga billiard manual dari Rp 30,000 ke Rp 60,000	2	TAB-260612194030	2026-06-12 19:40:34.839612
65	EXTEND_SESSION	kasir2	Tambah waktu meja MEJA 2 selama 60 menit. Tambahan biaya: Rp 30,000	2	\N	2026-06-12 19:40:34.92346
66	STOP_SESSION	kasir2	Stop sesi meja MEJA 1. Durasi: 60 menit. Total Billiard: Rp 30,000 | Cafe: Rp 0 | SC: Rp 0 | PPN: Rp 0 | Grand Total: Rp 30,000	1	\N	2026-06-12 20:10:06.37376
67	BILLIARD_PRICE_OVERRIDE	kasir2	Ubah harga billiard manual dari Rp 30,000 ke Rp 30,500	8	TAB-260612191129	2026-06-12 20:11:30.784
68	STOP_SESSION	kasir2	Stop sesi meja MEJA 8. Durasi: 60 menit. Total Billiard: Rp 30,500 | Cafe: Rp 0 | SC: Rp 0 | PPN: Rp 0 | Grand Total: Rp 30,500	8	\N	2026-06-12 20:11:30.959101
69	START_SESSION	kasir2	Mulai meja MEJA 6 (3 JAM WEEKEND) - Tamu: EVAN	6	\N	2026-06-12 20:17:47.775541
70	START_SESSION	kasir2	Mulai meja MEJA 8 (1 JAM WEEKEND) - Tamu: PUTRA	8	\N	2026-06-12 20:21:56.226159
71	BILLIARD_PRICE_OVERRIDE	kasir2	Ubah harga billiard manual dari Rp 30,000 ke Rp 60,000	8	TAB-260612202156	2026-06-12 20:22:00.415809
72	EXTEND_SESSION	kasir2	Tambah waktu meja MEJA 8 selama 60 menit. Tambahan biaya: Rp 30,000	8	\N	2026-06-12 20:22:00.501304
73	START_SESSION	kasir2	Mulai meja MEJA 7 (1 JAM WEEKEND) - Tamu: BARIEL	7	\N	2026-06-12 20:58:38.281911
74	BILLIARD_PRICE_OVERRIDE	kasir2	Ubah harga billiard manual dari Rp 30,000 ke Rp 60,000	4	TAB-260612190225	2026-06-12 21:02:25.406931
75	STOP_SESSION	kasir2	Stop sesi meja MEJA 4. Durasi: 120 menit. Total Billiard: Rp 60,000 | Cafe: Rp 0 | SC: Rp 0 | PPN: Rp 0 | Grand Total: Rp 60,000	4	\N	2026-06-12 21:02:25.560236
76	STOP_SESSION	Sistem (Auto-Cutoff Prepaid)	Stop sesi meja MEJA 10. Durasi: 120 menit. Total Billiard: Rp 70,000 | Cafe: Rp 0 | SC: Rp 0 | PPN: Rp 0 | Grand Total: Rp 70,000	10	\N	2026-06-12 21:11:49.314408
77	START_SESSION	kasir2	Mulai meja MEJA 5 (1 JAM WEEKEND) - Tamu: ALEX	5	\N	2026-06-12 21:23:44.50674
78	BILLIARD_PRICE_OVERRIDE	kasir2	Ubah harga billiard manual dari Rp 30,000 ke Rp 60,000	5	TAB-260612212344	2026-06-12 21:23:49.557367
79	EXTEND_SESSION	kasir2	Tambah waktu meja MEJA 5 selama 60 menit. Tambahan biaya: Rp 30,000	5	\N	2026-06-12 21:23:49.647118
80	STOP_SESSION	Sistem (Auto-Cutoff Prepaid)	Stop sesi meja MEJA 2. Durasi: 120 menit. Total Billiard: Rp 60,000 | Cafe: Rp 0 | SC: Rp 0 | PPN: Rp 0 | Grand Total: Rp 60,000	2	\N	2026-06-12 21:40:31.094401
81	BILLIARD_PRICE_OVERRIDE	kasir2	Ubah harga billiard manual dari Rp 60,000 ke Rp 90,000	2	TAB-260612194030	2026-06-12 21:42:05.015598
82	EXTEND_SESSION	kasir2	Tambah waktu meja MEJA 2 selama 60 menit. Tambahan biaya: Rp 30,000	2	\N	2026-06-12 21:42:05.102967
83	STOP_SESSION	Sistem (Auto-Cutoff Prepaid)	Stop sesi meja MEJA 3. Durasi: 180 menit. Total Billiard: Rp 85,000 | Cafe: Rp 0 | SC: Rp 0 | PPN: Rp 0 | Grand Total: Rp 85,000	3	\N	2026-06-12 21:53:32.509718
84	START_SESSION	kasir2	Mulai meja MEJA 1 (OPEN TABLE WEEKEND) - Tamu: PONOROGO	1	\N	2026-06-12 21:56:22.911699
85	STOP_SESSION	Sistem (Auto-Cutoff Prepaid)	Stop sesi meja MEJA 12. Durasi: 180 menit. Total Billiard: Rp 130,000 | Cafe: Rp 0 | SC: Rp 0 | PPN: Rp 0 | Grand Total: Rp 130,000	12	\N	2026-06-12 21:56:43.146062
86	STOP_SESSION	Sistem (Auto-Cutoff Prepaid)	Stop sesi meja MEJA 7. Durasi: 60 menit. Total Billiard: Rp 30,000 | Cafe: Rp 0 | SC: Rp 0 | PPN: Rp 0 | Grand Total: Rp 30,000	7	\N	2026-06-12 21:58:38.484321
87	STOP_SESSION	Sistem (Auto-Cutoff Prepaid)	Stop sesi meja MEJA 8. Durasi: 120 menit. Total Billiard: Rp 60,000 | Cafe: Rp 0 | SC: Rp 0 | PPN: Rp 0 | Grand Total: Rp 60,000	8	\N	2026-06-12 22:21:56.349556
88	BILLIARD_PRICE_OVERRIDE	kasir2	Ubah harga billiard manual dari Rp 60,000 ke Rp 90,000	8	TAB-260612202156	2026-06-12 22:22:24.573567
89	EXTEND_SESSION	kasir2	Tambah waktu meja MEJA 8 selama 60 menit. Tambahan biaya: Rp 30,000	8	\N	2026-06-12 22:22:24.652285
90	START_SESSION	kasir2	Mulai meja MEJA 7 (3 JAM WEEKEND) - Tamu: gandi	7	\N	2026-06-12 22:23:19.12273
91	START_SESSION	kasir2	Mulai meja MEJA 3 (OPEN TABLE WEEKEND) - Tamu: AGUNG	3	\N	2026-06-12 22:36:33.963121
92	STOP_SESSION	Sistem (Auto-Cutoff Prepaid)	Stop sesi meja MEJA 2. Durasi: 182 menit. Total Billiard: Rp 90,000 | Cafe: Rp 0 | SC: Rp 0 | PPN: Rp 0 | Grand Total: Rp 90,000	2	\N	2026-06-12 22:42:05.491583
93	START_SESSION	kasir2	Mulai meja MEJA 4 (1 JAM WEEKEND) - Tamu: RIAN	4	\N	2026-06-12 22:45:43.893415
94	BILLIARD_PRICE_OVERRIDE	kasir2	Ubah harga billiard manual dari Rp 30,000 ke Rp 60,000	4	TAB-260612224543	2026-06-12 22:45:47.476121
95	EXTEND_SESSION	kasir2	Tambah waktu meja MEJA 4 selama 60 menit. Tambahan biaya: Rp 30,000	4	\N	2026-06-12 22:45:47.555283
96	STOP_SESSION	kasir2	Stop sesi meja MEJA 1. Durasi: 60 menit. Total Billiard: Rp 30,000 | Cafe: Rp 0 | SC: Rp 0 | PPN: Rp 0 | Grand Total: Rp 30,000	1	\N	2026-06-12 22:56:22.241808
97	START_SESSION	kasir2	Mulai meja MEJA 1 (OPEN TABLE WEEKEND) - Tamu: RIFKY	1	\N	2026-06-12 23:11:08.348996
98	START_SESSION	kasir2	Mulai meja MEJA 2 (1 JAM WEEKEND) - Tamu: fiki	2	\N	2026-06-12 23:16:37.780155
99	STOP_SESSION	Sistem (Auto-Cutoff Prepaid)	Stop sesi meja MEJA 6. Durasi: 180 menit. Total Billiard: Rp 85,000 | Cafe: Rp 0 | SC: Rp 0 | PPN: Rp 0 | Grand Total: Rp 85,000	6	\N	2026-06-12 23:17:47.977089
100	STOP_SESSION	Sistem (Auto-Cutoff Prepaid)	Stop sesi meja MEJA 8. Durasi: 180 menit. Total Billiard: Rp 90,000 | Cafe: Rp 0 | SC: Rp 0 | PPN: Rp 0 | Grand Total: Rp 90,000	8	\N	2026-06-12 23:22:24.770455
101	STOP_SESSION	Sistem (Auto-Cutoff Prepaid)	Stop sesi meja MEJA 5. Durasi: 120 menit. Total Billiard: Rp 60,000 | Cafe: Rp 0 | SC: Rp 0 | PPN: Rp 0 | Grand Total: Rp 60,000	5	\N	2026-06-12 23:23:44.606034
102	START_SESSION	kasir2	Mulai meja MEJA 6 (1 JAM WEEKEND) - Tamu: EKO	6	\N	2026-06-12 23:25:35.579456
103	START_SESSION	kasir2	Mulai meja MEJA 8 (1 JAM WEEKEND) - Tamu: RIAN	8	\N	2026-06-12 23:31:02.313515
104	STOP_SESSION	kasir2	Stop sesi meja MEJA 7. Durasi: 83 menit. Total Billiard: Rp 85,000 | Cafe: Rp 0 | SC: Rp 0 | PPN: Rp 0 | Grand Total: Rp 85,000	7	\N	2026-06-12 23:46:18.493611
105	STOP_SESSION	Sistem (Auto-Cutoff Prepaid)	Stop sesi meja MEJA 2. Durasi: 60 menit. Total Billiard: Rp 30,000 | Cafe: Rp 0 | SC: Rp 0 | PPN: Rp 0 | Grand Total: Rp 30,000	2	\N	2026-06-13 00:16:37.959739
106	STOP_SESSION	Sistem (Auto-Cutoff Prepaid)	Stop sesi meja MEJA 6. Durasi: 60 menit. Total Billiard: Rp 30,000 | Cafe: Rp 0 | SC: Rp 0 | PPN: Rp 0 | Grand Total: Rp 30,000	6	\N	2026-06-13 00:25:35.917968
107	STOP_SESSION	Sistem (Auto-Cutoff Prepaid)	Stop sesi meja MEJA 8. Durasi: 60 menit. Total Billiard: Rp 30,000 | Cafe: Rp 0 | SC: Rp 0 | PPN: Rp 0 | Grand Total: Rp 30,000	8	\N	2026-06-13 00:31:03.313012
108	STOP_SESSION	Sistem (Auto-Cutoff Prepaid)	Stop sesi meja MEJA 4. Durasi: 120 menit. Total Billiard: Rp 60,000 | Cafe: Rp 0 | SC: Rp 0 | PPN: Rp 0 | Grand Total: Rp 60,000	4	\N	2026-06-13 00:45:43.933529
109	START_SESSION	kasir2	Mulai meja MEJA 4 (OPEN TABLE WEEKEND) - Tamu: .	4	\N	2026-06-13 00:49:44.429692
110	START_SESSION	kasir2	Mulai meja MEJA 5 (OPEN TABLE WEEKEND) - Tamu: OKI	5	\N	2026-06-13 00:59:20.716491
111	START_SESSION	1	Mulai meja MEJA 2 (Custom Session) - Tamu: Tirta	2	\N	2026-06-13 01:06:56.352139
112	BILLIARD_PRICE_OVERRIDE	1	Ubah harga billiard manual dari Rp 416.67 ke Rp 417	2	TAB-260612010656	2026-06-13 01:07:11.446241
113	STOP_SESSION	1	Stop sesi meja MEJA 2. Durasi: 0 menit. Total Billiard: Rp 417 | Cafe: Rp 0 | SC: Rp 0 | PPN: Rp 0 | Grand Total: Rp 500	2	\N	2026-06-13 01:07:11.584316
114	BILLIARD_PRICE_OVERRIDE	kasir2	Ubah harga billiard manual dari Rp 30,000 ke Rp 64,000	1	TAB-260612231108	2026-06-13 01:18:37.976633
115	STOP_SESSION	kasir2	Stop sesi meja MEJA 1. Durasi: 127 menit. Total Billiard: Rp 64,000 | Cafe: Rp 0 | SC: Rp 0 | PPN: Rp 0 | Grand Total: Rp 64,000	1	\N	2026-06-13 01:18:38.131438
116	START_SESSION	kasir2	Mulai meja MEJA 1 (OPEN TABLE WEEKEND) - Tamu: JOKOWI	1	\N	2026-06-13 01:24:06.019114
117	STOP_SESSION	kasir2	Stop sesi meja MEJA 4. Durasi: 59 menit. Total Billiard: Rp 30,000 | Cafe: Rp 0 | SC: Rp 0 | PPN: Rp 0 | Grand Total: Rp 30,000	4	\N	2026-06-13 01:49:01.58802
118	BILLIARD_PRICE_OVERRIDE	kasir2	Ubah harga billiard manual dari Rp 30,000 ke Rp 36,000	5	TAB-260612005920	2026-06-13 02:11:20.278598
119	STOP_SESSION	kasir2	Stop sesi meja MEJA 5. Durasi: 72 menit. Total Billiard: Rp 36,000 | Cafe: Rp 0 | SC: Rp 0 | PPN: Rp 0 | Grand Total: Rp 36,000	5	\N	2026-06-13 02:11:20.424386
120	BILLIARD_PRICE_OVERRIDE	kasir2	Ubah harga billiard manual dari Rp 30,000 ke Rp 52,500	1	TAB-260612012405	2026-06-13 03:08:17.649383
121	STOP_SESSION	kasir2	Stop sesi meja MEJA 1. Durasi: 104 menit. Total Billiard: Rp 52,500 | Cafe: Rp 0 | SC: Rp 0 | PPN: Rp 0 | Grand Total: Rp 52,500	1	\N	2026-06-13 03:08:17.834856
122	BILLIARD_PRICE_OVERRIDE	kasir2	Ubah harga billiard manual dari Rp 30,000 ke Rp 143,500	3	TAB-260612223633	2026-06-13 03:22:44.231999
123	STOP_SESSION	kasir2	Stop sesi meja MEJA 3. Durasi: 286 menit. Total Billiard: Rp 143,500 | Cafe: Rp 0 | SC: Rp 0 | PPN: Rp 0 | Grand Total: Rp 143,500	3	\N	2026-06-13 03:22:44.426775
\.


--
-- Data for Name: battle_plan_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.battle_plan_items (id, "battlePlanId", "menuItemId", "packageId", "promoId", "targetQuantity", "soldQuantity", "aiLabel", "isAutoBroadcastEnabled") FROM stdin;
10	1	\N	10	\N	10	0	🚀 Upsell	f
11	1	\N	17	\N	10	0	🚀 Upsell	f
12	1	\N	9	\N	10	0	🚀 Upsell	f
14	1	\N	14	\N	3	0	🚀 Upsell	f
9	1	\N	16	\N	10	1	🚀 Upsell	f
8	1	\N	15	\N	10	2	🚀 Upsell	f
13	1	\N	19	\N	10	1	🚀 Upsell	f
\.


--
-- Data for Name: battle_plans; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.battle_plans (id, "businessDayId", "targetRevenue", "predictedRevenue", status, "aiStrategyBrief", "createdAt", "updatedAt") FROM stdin;
1	1	1875000.00	0.00	DRAFT	Target Rev: Rp 1,875,000. Est. 25 pax (Avg: Rp 75,000). Trafik diprediksi stabil sepanjang hari. Prioritaskan 7 Paket Billiard untuk filling occupancy.	2026-06-12 07:00:00.448459	2026-06-12 07:00:00.654612
\.


--
-- Data for Name: billiard_packages; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.billiard_packages (id, name, "categoryId", type, "durationMinutes", price, "minutePrice", "timeSlots", "isActive", "createdAt", "updatedAt", "validDays") FROM stdin;
8	3 JAM WEEKDAYS	3	fixed	180	0.00	\N	[{"start":"10:00","end":"17:00","price":"53000"},{"start":"17:00","end":"02:00","price":"77000"},{"start":"02:00","end":"10:00","price":"77000"}]	t	2026-06-12 02:59:49.838691	2026-06-12 16:50:40.404241	MON,TUE,WED,THU
7	2 JAM WEEKDAYS	3	fixed	120	0.00	\N	[{"start":"10:00","end":"17:00","price":"35000"}]	t	2026-06-12 02:59:09.860926	2026-06-12 16:50:54.862819	MON,TUE,WED,THU
6	1 JAM WEEKDAYS	3	fixed	60	0.00	\N	[{"start":"10:00","end":"17:00","price":"20000"},{"start":"17:00","end":"02:00","price":"25000"},{"start":"02:00","end":"10:00","price":"25000"}]	t	2026-06-12 02:57:56.402711	2026-06-12 16:51:11.993006	MON,TUE,WED,THU
17	OPEN TABLE WEEKEND	1	hourly	120	0.00	\N	[{"start":"10:00","end":"17:00","price":"35000"},{"start":"17:00","end":"02:00","price":"45000"},{"start":"02:00","end":"10:00","price":"45000"}]	t	2026-06-12 04:27:03.417107	2026-06-12 16:54:14.628938	SAT,SUN,FRI
10	3 JAM WEEKDAYS	1	fixed	180	0.00	\N	[{"start":"10:00","end":"17:00","price":"10000"},{"start":"18:00","end":"02:00","price":"115000"},{"start":"02:00","end":"10:00","price":"115000"}]	t	2026-06-12 03:03:42.064357	2026-06-12 16:54:30.268097	MON,TUE,WED,THU
5	OPEN TABLE WEEKDAYS	3	hourly	120	0.00	\N	[{"start":"10:00","end":"17:00","price":"20000"},{"start":"17:00","end":"02:00","price":"25000"},{"start":"02:00","end":"10:00","price":"25000"}]	t	2026-06-12 02:57:26.926031	2026-06-12 16:51:26.356191	MON,TUE,WED,THU
16	3 JAM WEEKEND	2	fixed	180	0.00	\N	[{"start":"10:00","end":"17:00","price":"70000"},{"start":"17:00","end":"02:00","price":"100000"},{"start":"02:00","end":"10:00","price":"100000"}]	t	2026-06-12 04:26:28.873851	2026-06-12 16:51:48.570888	SAT,SUN,FRI
15	1 JAM WEEKEND	2	fixed	60	0.00	\N	[{"start":"10:00","end":"17:00","price":"25000"},{"start":"17:00","end":"02:00","price":"35000"},{"start":"02:00","end":"18:00","price":"35000"}]	t	2026-06-12 04:25:11.527332	2026-06-12 16:51:58.912957	SAT,SUN,FRI
14	OPEN TABLE WEEKEND	2	hourly	120	0.00	\N	[{"start":"10:00","end":"17:00","price":"25000"},{"start":"17:00","end":"02:00","price":"35000"},{"start":"02:00","end":"10:00","price":"35000"}]	t	2026-06-12 04:24:30.272037	2026-06-12 16:52:09.195916	SAT,SUN,FRI
2	1 JAM WEEKDAYS	1	fixed	60	0.00	\N	[{"start":"10:00","end":"17:00","price":"35000"},{"start":"17:00","end":"02:00","price":"40000"},{"start":"02:00","end":"10:00","price":"40000"}]	t	2026-06-12 02:53:47.537025	2026-06-12 16:54:46.052561	MON,TUE,WED,THU
9	3 JAM WEEKDAYS	2	fixed	180	0.00	\N	[{"start":"10:00","end":"17:00","price":"70000"},{"start":"17:00","end":"02:00","price":"85000"},{"start":"02:00","end":"10:00","price":"85000"}]	t	2026-06-12 03:02:56.681163	2026-06-12 16:52:23.228257	MON,TUE,WED,THU
1	OPEN TABLE WEEKDAYS	1	hourly	120	0.00	\N	[{"start":"10:00","end":"17:00","price":"35000"},{"start":"17:00","end":"02:00","price":"40000"},{"start":"02:00","end":"10:00","price":"40000"}]	t	2026-06-12 02:53:04.404711	2026-06-12 16:56:11.497873	MON,TUE,WED,THU
13	3 JAM WEEKEND	3	fixed	180	0.00	\N	[{"start":"10:00","end":"17:00","price":"55000"},{"start":"17:00","end":"02:00","price":"85000"},{"start":"02:00","end":"10:00","price":"85000"}]	t	2026-06-12 04:23:17.904691	2026-06-12 16:49:49.991344	SAT,SUN,FRI
12	1 JAM WEEKEND	3	fixed	60	0.00	\N	[{"start":"10:00","end":"17:00","price":"20000"},{"start":"17:00","end":"02:00","price":"30000"},{"start":"02:00","end":"10:00","price":"30000"}]	t	2026-06-12 04:22:30.893839	2026-06-12 16:50:11.668884	SAT,SUN,FRI
11	OPEN TABLE WEEKEND	3	hourly	120	0.00	\N	[{"start":"10:00","end":"17:00","price":"20000"},{"start":"17:00","end":"02:00","price":"30000"},{"start":"02:00","end":"10:00","price":"30000"}]	t	2026-06-12 04:21:49.978378	2026-06-12 16:50:25.318535	SAT,SUN,FRI
4	1 JAM WEEKDAYS	2	fixed	60	0.00	\N	[{"start":"10:00","end":"17:00","price":"25000"},{"start":"17:00","end":"02:00","price":"30000"},{"start":"02:00","end":"10:00","price":"30000"}]	t	2026-06-12 02:56:29.470083	2026-06-12 16:52:56.741851	MON,TUE,WED,THU
3	OPEN TABLE WEEKDAYS	2	hourly	120	0.00	\N	[{"start":"10:00","end":"17:00","price":"25000"},{"start":"17:00","end":"02:00","price":"30000"},{"start":"02:00","end":"10:00","price":"30000"}]	t	2026-06-12 02:55:08.87147	2026-06-12 16:53:10.548858	MON,TUE,WED,THU
19	3 JAM WEEKEND	1	fixed	180	0.00	\N	[{"start":"10:00","end":"17:00","price":"100000"},{"start":"17:00","end":"02:00","price":"130000"},{"start":"02:00","end":"10:00","price":"130000"}]	t	2026-06-12 04:28:23.036463	2026-06-12 16:54:04.6727	SAT,SUN,FRI
\.


--
-- Data for Name: business_closures; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.business_closures (id, "startDate", "endDate", reason, "createdAt") FROM stdin;
\.


--
-- Data for Name: business_days; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.business_days (id, date, "startTime", "endTime", "isClosed", "totalRevenue", "totalExpenses", "totalTopUp", "isAudited", "createdAt") FROM stdin;
1	2026-06-12	2026-06-12 02:32:05.046	2026-06-13 03:45:44.745	t	1849000.00	0.00	0.00	t	2026-06-12 02:32:05.046912
2	2026-06-13	2026-06-13 03:45:56.353	\N	f	0.00	0.00	0.00	f	2026-06-13 03:45:56.355008
\.


--
-- Data for Name: cafe_tables; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.cafe_tables (id, "tableName", capacity, status, "currentTransactionId", "currentCustomer", "isBooked", "bookedByWaitingId", "bookedByName", "createdAt", "updatedAt", "deletedAt") FROM stdin;
3	3	4	available	\N	\N	f	\N	\N	2026-06-12 05:41:28.080443	2026-06-12 05:41:28.080443	\N
4	4	4	available	\N	\N	f	\N	\N	2026-06-12 05:41:35.488118	2026-06-12 05:41:35.488118	\N
5	5	4	available	\N	\N	f	\N	\N	2026-06-12 05:41:42.218282	2026-06-12 05:41:42.218282	\N
6	6	4	available	\N	\N	f	\N	\N	2026-06-12 05:41:49.768573	2026-06-12 05:41:49.768573	\N
7	7	4	available	\N	\N	f	\N	\N	2026-06-12 05:41:55.939374	2026-06-12 05:41:55.939374	\N
8	8	4	available	\N	\N	f	\N	\N	2026-06-12 05:42:02.275914	2026-06-12 05:42:02.275914	\N
9	9	4	available	\N	\N	f	\N	\N	2026-06-12 05:42:08.859902	2026-06-12 05:42:08.859902	\N
10	10	4	available	\N	\N	f	\N	\N	2026-06-12 05:42:15.838465	2026-06-12 05:42:15.838465	\N
11	11	4	available	\N	\N	f	\N	\N	2026-06-12 05:42:30.360665	2026-06-12 05:42:30.360665	\N
12	12	4	available	\N	\N	f	\N	\N	2026-06-12 05:42:37.8796	2026-06-12 05:42:37.8796	\N
1	1	4	available	\N	\N	f	\N	\N	2026-06-12 05:40:50.744268	2026-06-13 03:40:58.200481	\N
2	2	4	available	\N	\N	f	\N	\N	2026-06-12 05:40:57.020304	2026-06-13 03:41:06.342074	\N
\.


--
-- Data for Name: cashflow; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.cashflow (id, amount, type, source, "referenceId", description, "paymentMethod", "timestamp", "balanceAfter", "businessDayId", "shiftId") FROM stdin;
1	25000.00	in	sale:billiard	TAB-260612101257	Payment INV: TAB-260612101257 (CASH)	CASH	2026-06-12 11:28:12.052	25000.00	1	1
2	40000.00	in	sale:billiard	TAB-260612112648	Payment INV: TAB-260612112648 (QRIS)	QRIS	2026-06-12 13:29:37.165	65000.00	1	1
3	44000.00	in	sale:billiard	TAB-260612113911	Payment INV: TAB-260612113911 (CASH)	CASH	2026-06-12 13:52:17.088	109000.00	1	1
4	20000.00	in	sale:billiard	TAB-260612125158	Payment INV: TAB-260612125158 (CASH)	CASH	2026-06-12 13:54:22.938	129000.00	1	1
5	60000.00	in	sale:billiard	TAB-260612110548	Payment INV: TAB-260612110548 (CASH)	CASH	2026-06-12 14:10:13.061	189000.00	1	1
6	20000.00	in	sale:billiard	TAB-260612141102	Payment INV: TAB-260612141102 (CASH)	CASH	2026-06-12 15:20:49.74	209000.00	1	1
7	53000.00	in	sale:billiard	TAB-260612125653	Payment INV: TAB-260612125653 (CASH)	CASH	2026-06-12 15:58:23.74	262000.00	1	1
8	40000.00	in	sale:billiard	TAB-260612135846	Payment INV: TAB-260612135846 (CASH)	CASH	2026-06-12 16:00:40.538	302000.00	1	1
9	20000.00	in	sale:billiard	TAB-260612164435	Payment INV: TAB-260612164435 (CASH)	CASH	2026-06-12 17:49:16.089	322000.00	1	1
10	70000.00	in	sale:billiard	TAB-260612170026	Payment INV: TAB-260612170026 (QRIS)	QRIS	2026-06-12 19:05:35	392000.00	1	1
11	105000.00	in	sale:billiard	TAB-260612153321	Payment INV: TAB-260612153321 (CASH)	CASH	2026-06-12 19:38:39.178	497000.00	1	1
12	30000.00	in	sale:billiard	TAB-260612191007	Payment INV: TAB-260612191007 (CASH)	CASH	2026-06-12 20:10:21.666	527000.00	1	2
13	30500.00	in	sale:billiard	TAB-260612191129	Payment INV: TAB-260612191129 (CASH)	CASH	2026-06-12 20:12:55.598	557500.00	1	2
14	60000.00	in	sale:billiard	TAB-260612190225	Payment INV: TAB-260612190225 (CASH)	CASH	2026-06-12 21:02:53.221	617500.00	1	2
15	70000.00	in	sale:billiard	TAB-260612191149	Payment INV: TAB-260612191149 (CASH)	CASH	2026-06-12 21:15:36.53	687500.00	1	2
16	85000.00	in	sale:billiard	TAB-260612185332	Payment INV: TAB-260612185332 (CASH)	CASH	2026-06-12 21:54:17.462	772500.00	1	2
17	130000.00	in	sale:billiard	TAB-260612185642	Payment INV: TAB-260612185642 (QRIS)	QRIS	2026-06-12 21:57:13.602	902500.00	1	2
18	30000.00	in	sale:billiard	TAB-260612205838	Payment INV: TAB-260612205838 (QRIS)	QRIS	2026-06-12 22:02:07.749	932500.00	1	2
19	90000.00	in	sale:billiard	TAB-260612194030	Payment INV: TAB-260612194030 (CASH)	CASH	2026-06-12 22:46:12.73	1022500.00	1	2
20	30000.00	in	sale:billiard	TAB-260612215622	Payment INV: TAB-260612215622 (CASH)	CASH	2026-06-12 22:56:44.805	1052500.00	1	2
21	85000.00	in	sale:billiard	TAB-260612201747	Payment INV: TAB-260612201747 (CASH)	CASH	2026-06-12 23:20:50.026	1137500.00	1	2
22	90000.00	in	sale:billiard	TAB-260612202156	Payment INV: TAB-260612202156 (QRIS)	QRIS	2026-06-12 23:22:50.991	1227500.00	1	2
23	60000.00	in	sale:billiard	TAB-260612212344	Payment INV: TAB-260612212344 (CASH)	CASH	2026-06-12 23:27:22.978	1287500.00	1	2
24	85000.00	in	sale:billiard	TAB-260612222318	Payment INV: TAB-260612222318 (CASH)	CASH	2026-06-12 23:46:25.282	1372500.00	1	2
25	30000.00	in	sale:billiard	TAB-260612231637	Payment INV: TAB-260612231637 (CASH)	CASH	2026-06-13 00:18:31.928	1402500.00	1	2
26	30000.00	in	sale:billiard	TAB-260612232535	Payment INV: TAB-260612232535 (CASH)	CASH	2026-06-13 00:26:06.508	1432500.00	1	2
27	30000.00	in	sale:billiard	TAB-260612233102	Payment INV: TAB-260612233102 (CASH)	CASH	2026-06-13 00:31:30.914	1462500.00	1	2
28	60000.00	in	sale:billiard	TAB-260612224543	Payment INV: TAB-260612224543 (CASH)	CASH	2026-06-13 00:49:09.384	1522500.00	1	2
29	500.00	in	sale:billiard	TAB-260612010656	Payment INV: TAB-260612010656 (QRIS)	QRIS	2026-06-13 01:07:18.139	1523000.00	1	2
30	64000.00	in	sale:billiard	TAB-260612231108	Payment INV: TAB-260612231108 (CASH)	CASH	2026-06-13 01:18:51.017	1587000.00	1	2
31	30000.00	in	sale:billiard	TAB-260612004944	Payment INV: TAB-260612004944 (CASH)	CASH	2026-06-13 01:49:09.282	1617000.00	1	2
32	36000.00	in	sale:billiard	TAB-260612005920	Payment INV: TAB-260612005920 (CASH)	CASH	2026-06-13 02:13:11.425	1653000.00	1	2
33	52500.00	in	sale:billiard	TAB-260612012405	Payment INV: TAB-260612012405 (CASH)	CASH	2026-06-13 03:08:29.44	1705500.00	1	2
34	143500.00	in	sale:billiard	TAB-260612223633	Payment INV: TAB-260612223633 (CASH)	CASH	2026-06-13 03:22:51.329	1849000.00	1	2
35	0.00	in	sale:cafe	CAFE-20260612-0001-815	Payment INV: CAFE-20260612-0001-815 (CASH)	CASH	2026-06-13 03:40:58.744	1849000.00	1	2
36	0.00	in	sale:cafe	CAFE-20260613-0002-764	Payment INV: CAFE-20260613-0002-764 (CASH)	CASH	2026-06-13 03:41:07.072	1849000.00	1	2
\.


--
-- Data for Name: cashflow_archive; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.cashflow_archive (id, amount, type, source, "referenceId", description, "paymentMethod", "timestamp", "balanceAfter", "businessDayId", "shiftId") FROM stdin;
\.


--
-- Data for Name: categories; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.categories (id, name, type, "productionTarget", "isActive", "createdAt", "updatedAt") FROM stdin;
3	MAKANAN	MENU	KDS	t	2026-06-13 03:47:52.36183	2026-06-13 03:47:52.36183
4	MINUMAN	MENU	BDS	t	2026-06-13 03:48:19.988375	2026-06-13 03:48:19.988375
6	STORE	MENU	NONE	t	2026-06-13 03:50:40.337013	2026-06-13 03:50:40.337013
\.


--
-- Data for Name: chat_messages; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.chat_messages (id, "senderId", "receiverId", message, "timestamp", "isRead", type, "readByUserId") FROM stdin;
\.


--
-- Data for Name: daily_order_summaries; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.daily_order_summaries (id, date, station, "totalItems", "itemsJson", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: employee_shift_schedules; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.employee_shift_schedules (id, "userId", date, "shiftName", "isSwap", "swappedWithUserId", "swapNote", "createdByAdminId", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: expenses; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.expenses (id, amount, category, description, date, "recordedBy", "recordedByUserId", status, "shiftId", "businessDayId") FROM stdin;
\.


--
-- Data for Name: ingredient_batches; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.ingredient_batches (id, "ingredientId", "stockInId", "batchNumber", "initialQuantity", "remainingQuantity", "costPrice", status, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: ingredients; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.ingredients (id, name, unit, "stockQuantity", min_stock_level, sku, category, "costPrice", "expiryDate", "lastAuditDate", description, "imageUrl", "yieldPercentage", "lastPurchasePrice", "lastPurchaseQuantity", "lastPurchaseUnit", "isMandatoryReporting", department, "isHighValue", "auditFrequency", "isBatchTracked", "baseUnit", "displayUnit", "conversionFactor", "wasteThreshold", "createdAt", "updatedAt", "deletedAt") FROM stdin;
49	REDVALVET (DELETED-1781299983116)	Pcs	64.000	2.000	IG-001-DEL-1781299983116	Packaging	0.00	\N	\N			100.00	\N	\N	\N	f	CASHIER	f	SHIFT	f	\N	\N	\N	\N	2026-06-13 03:54:55.701222	2026-06-13 04:33:03.12664	2026-06-13 04:33:03.12664
8	RICH CHOCO (DELETED-1781297554751)	Pcs	58.000	10.000	IG-008-DEL-1781297554751	MINUMAN	15000.00	\N	\N			100.00	15000.00	1.000	Gram	f	BAR	f	SHIFT	f			0.00	0.00	2026-06-12 11:22:32.087891	2026-06-13 03:52:34.760694	2026-06-13 03:52:34.760694
41	NASI GORENG JAWA (DELETED-1781297470937)	Ml	99.000	10.000	IG-040-DEL-1781297470937	MINUMAN	15000.00	\N	\N			100.00	15000.00	1.000	Gram	f	KITCHEN	f	SHIFT	f			0.00	0.00	2026-06-12 19:22:12.879044	2026-06-13 03:51:10.996919	2026-06-13 03:51:10.996919
48	TEMPE KEMUL (DELETED-1781297452611)	Ml	999.000	10.000	IG-047-DEL-1781297452611	MINUMAN	12000.00	\N	\N			100.00	12000.00	1.000	Gram	f	KITCHEN	f	SHIFT	f	\N	\N	\N	\N	2026-06-12 19:34:44.682669	2026-06-13 03:50:52.714856	2026-06-13 03:50:52.714856
47	PISANG GORENG (DELETED-1781297457040)	Ml	999.000	10.000	IG-046-DEL-1781297457040	MINUMAN	15000.00	\N	\N			100.00	15000.00	1.000	Gram	f	KITCHEN	f	SHIFT	f	\N	\N	\N	\N	2026-06-12 19:33:59.584258	2026-06-13 03:50:57.050861	2026-06-13 03:50:57.050861
46	ES BATU (DELETED-1781297462465)	Ml	999.000	10.000	IG-045-DEL-1781297462465	MINUMAN	1000.00	\N	\N			100.00	1000.00	1.000	Gram	f	BAR	f	SHIFT	f	\N	\N	\N	\N	2026-06-12 19:32:14.59058	2026-06-13 03:51:02.515467	2026-06-13 03:51:02.515467
45	INDOMIE GORENG DOBEL (DELETED-1781297465487)	Ml	999.000	10.000	IG-044-DEL-1781297465487	MINUMAN	15000.00	\N	\N			100.00	15000.00	1.000	Gram	f	KITCHEN	f	SHIFT	f	\N	\N	\N	\N	2026-06-12 19:31:07.542224	2026-06-13 03:51:05.496252	2026-06-13 03:51:05.496252
44	INDOMIE GORENG (DELETED-1781297467022)	Ml	999.000	10.000	IG-043-DEL-1781297467022	MINUMAN	8000.00	\N	\N			100.00	8000.00	1.000	Gram	f	KITCHEN	f	SHIFT	f	\N	\N	\N	\N	2026-06-12 19:30:14.774503	2026-06-13 03:51:07.033387	2026-06-13 03:51:07.033387
43	TAMBAH TELUR (DELETED-1781297468143)	Gram	999.000	10.000	IG-042-DEL-1781297468143	MINUMAN	4000.00	\N	\N			100.00	4000.00	1.000	Gram	f	KITCHEN	f	SHIFT	f	\N	\N	\N	\N	2026-06-12 19:24:28.524601	2026-06-13 03:51:08.153523	2026-06-13 03:51:08.153523
42	NASI GORENG SPECIAL (DELETED-1781297469603)	Ml	99.000	10.000	IG-041-DEL-1781297469603	MINUMAN	18000.00	\N	\N			100.00	18000.00	1.000	Gram	f	KITCHEN	f	SHIFT	f	\N	\N	\N	\N	2026-06-12 19:23:12.291047	2026-06-13 03:51:09.61362	2026-06-13 03:51:09.61362
40	LECI TEA (DELETED-1781297474751)	Gram	0.000	0.000	001-DEL-1781297474751	MINUMAN	10000.00	\N	\N			100.00	10000.00	1.000	Gram	f	BAR	f	SHIFT	f	\N	\N	\N	\N	2026-06-12 19:18:50.389811	2026-06-13 03:51:14.805448	2026-06-13 03:51:14.805448
39	BLUE LAKEN (DELETED-1781297477367)	Pcs	2.000	10.000	IG-039-DEL-1781297477367	MINUMAN	15000.00	\N	\N			100.00	15000.00	1.000	Gram	f	BAR	f	SHIFT	f	\N	\N	\N	\N	2026-06-12 12:34:12.905687	2026-06-13 03:51:17.37916	2026-06-13 03:51:17.37916
38	TEMULAWAK BEER (DELETED-1781297479298)	Pcs	1.000	10.000	IG-038-DEL-1781297479298	MINUMAN	15000.00	\N	\N			100.00	15000.00	1.000	Gram	f	BAR	f	SHIFT	f	\N	\N	\N	\N	2026-06-12 12:33:17.968719	2026-06-13 03:51:19.325355	2026-06-13 03:51:19.325355
37	SARSAPARILLA BEER (DELETED-1781297481809)	Pcs	13.000	10.000	IG-037-DEL-1781297481809	MINUMAN	15000.00	\N	\N			100.00	15000.00	1.000	Gram	f	BAR	f	SHIFT	f	\N	\N	\N	\N	2026-06-12 12:32:51.219459	2026-06-13 03:51:21.822844	2026-06-13 03:51:21.822844
36	LYCHEE BEER (DELETED-1781297486853)	Pcs	10.000	10.000	IG-036-DEL-1781297486853	MINUMAN	15000.00	\N	\N			100.00	15000.00	1.000	Gram	f	BAR	f	SHIFT	f	\N	\N	\N	\N	2026-06-12 12:31:53.652099	2026-06-13 03:51:26.891602	2026-06-13 03:51:26.891602
35	COFFE BEER (DELETED-1781297488664)	Pcs	20.000	10.000	IG-035-DEL-1781297488664	MINUMAN	15000.00	\N	\N			100.00	15000.00	1.000	Gram	f	BAR	f	SHIFT	f	\N	\N	\N	\N	2026-06-12 12:30:30.403848	2026-06-13 03:51:28.734453	2026-06-13 03:51:28.734453
34	ULTRAMILK (DELETED-1781297490455)	Pcs	20.000	10.000	IG-034-DEL-1781297490455	MINUMAN	10000.00	\N	\N			100.00	10000.00	1.000	Gram	f	BAR	f	SHIFT	f	\N	\N	\N	\N	2026-06-12 12:29:14.424695	2026-06-13 03:51:30.46958	2026-06-13 03:51:30.46958
33	CIMORY (DELETED-1781297491479)	Pcs	10.000	10.000	IG-033-DEL-1781297491479	MINUMAN	12000.00	\N	\N			100.00	12000.00	1.000	Gram	f	BAR	f	SHIFT	f	\N	\N	\N	\N	2026-06-12 12:28:44.486308	2026-06-13 03:51:31.505515	2026-06-13 03:51:31.505515
32	FRESHTEA (DELETED-1781297493727)	Pcs	44.000	10.000	IG-032-DEL-1781297493727	MINUMAN	7000.00	\N	\N			100.00	7000.00	1.000	Gram	f	BAR	f	SHIFT	f	\N	\N	\N	\N	2026-06-12 12:27:50.362404	2026-06-13 03:51:33.738181	2026-06-13 03:51:33.738181
31	NUTRIBOOST (DELETED-1781297494658)	Pcs	4.000	10.000	IG-031-DEL-1781297494658	MINUMAN	10000.00	\N	\N			100.00	10000.00	1.000	Gram	f	BAR	f	SHIFT	f	\N	\N	\N	\N	2026-06-12 12:26:36.195298	2026-06-13 03:51:34.683559	2026-06-13 03:51:34.683559
30	TEBS (DELETED-1781297496223)	Pcs	1.000	10.000	IG-030-DEL-1781297496223	MINUMAN	8000.00	\N	\N			100.00	8000.00	1.000	Gram	f	BAR	f	SHIFT	f	\N	\N	\N	\N	2026-06-12 12:24:06.904741	2026-06-13 03:51:36.268815	2026-06-13 03:51:36.268815
28	COKE ZERO (DELETED-1781297503955)	Pcs	16.000	10.000	IG-028-DEL-1781297503955	MINUMAN	11000.00	\N	\N			100.00	11000.00	1.000	Gram	f	BAR	f	SHIFT	f	\N	\N	\N	\N	2026-06-12 12:21:48.576535	2026-06-13 03:51:43.984484	2026-06-13 03:51:43.984484
26	FANTA (DELETED-1781297508016)	Pcs	34.000	10.000	IG-026-DEL-1781297508016	MINUMAN	7000.00	\N	\N			100.00	7000.00	1.000	Gram	f	BAR	f	SHIFT	f	\N	\N	\N	\N	2026-06-12 12:18:26.362179	2026-06-13 03:51:48.049362	2026-06-13 03:51:48.049362
25	COCA COLA (DELETED-1781297509366)	Pcs	18.000	10.000	IG-025-DEL-1781297509366	MINUMAN	7000.00	\N	\N			100.00	7000.00	1.000	Gram	f	BAR	f	SHIFT	f	\N	\N	\N	\N	2026-06-12 12:17:53.028906	2026-06-13 03:51:49.441386	2026-06-13 03:51:49.441386
24	WATER LEMON SPRITE (DELETED-1781297510939)	Pcs	9.000	10.000	IG-024-DEL-1781297510939	MINUMAN	9000.00	\N	\N			100.00	9000.00	1.000	Gram	f	BAR	f	SHIFT	f	\N	\N	\N	\N	2026-06-12 12:17:21.743864	2026-06-13 03:51:50.959078	2026-06-13 03:51:50.959078
22	YOU C 1000 (DELETED-1781297519761)	Pcs	19.000	10.000	IG-022-DEL-1781297519761	MINUMAN	12000.00	\N	\N			100.00	12000.00	1.000	Gram	f	BAR	f	SHIFT	f	\N	\N	\N	\N	2026-06-12 12:11:51.518208	2026-06-13 03:51:59.855754	2026-06-13 03:51:59.855754
21	SPRITE (DELETED-1781297522327)	Pcs	30.000	10.000	IG-021-DEL-1781297522327	MINUMAN	7000.00	\N	\N			100.00	7000.00	1.000	Gram	f	BAR	f	SHIFT	f	\N	\N	\N	\N	2026-06-12 12:11:17.580255	2026-06-13 03:52:02.34997	2026-06-13 03:52:02.34997
19	KOPI PANDAN (DELETED-1781297529614)	Pcs	150.000	10.000	IG-019-DEL-1781297529614	MINUMAN	15000.00	\N	\N			100.00	15000.00	1.000	Gram	f	BAR	f	SHIFT	f	\N	\N	\N	\N	2026-06-12 11:57:41.844748	2026-06-13 03:52:09.637691	2026-06-13 03:52:09.637691
18	KOPI GULA AREN (DELETED-1781297533876)	Pcs	150.000	10.000	IG-018-DEL-1781297533876	MINUMAN	15000.00	\N	\N			100.00	15000.00	1.000	Gram	f	BAR	f	SHIFT	f	\N	\N	\N	\N	2026-06-12 11:57:06.961667	2026-06-13 03:52:13.888668	2026-06-13 03:52:13.888668
17	HOT AMERICANO (DELETED-1781297536019)	Pcs	209.000	10.000	IG-017-DEL-1781297536019	MINUMAN	15000.00	\N	\N			100.00	15000.00	1.000	Gram	f	BAR	f	SHIFT	f	\N	\N	\N	\N	2026-06-12 11:56:22.13666	2026-06-13 03:52:16.052917	2026-06-13 03:52:16.052917
15	KOPI SUSU (DELETED-1781297540842)	Pcs	1000.000	10.000	IG-015-DEL-1781297540842	MINUMAN	12000.00	\N	\N			100.00	12000.00	1.000	Gram	f	BAR	f	SHIFT	f	\N	\N	\N	\N	2026-06-12 11:55:25.836144	2026-06-13 03:52:20.851638	2026-06-13 03:52:20.851638
14	KOPI HITAM (DELETED-1781297544130)	Pcs	1000.000	10.000	IG-014-DEL-1781297544130	MINUMAN	10000.00	\N	\N			100.00	10000.00	1.000	Gram	f	BAR	f	SHIFT	f	\N	\N	\N	\N	2026-06-12 11:55:02.857428	2026-06-13 03:52:24.149653	2026-06-13 03:52:24.149653
12	ES TEH (DELETED-1781297547734)	Pcs	1000.000	10.000	IG-012-DEL-1781297547734	MINUMAN	7000.00	\N	\N			100.00	7000.00	1.000	Gram	f	BAR	f	SHIFT	f	\N	\N	\N	\N	2026-06-12 11:48:13.017522	2026-06-13 03:52:27.749165	2026-06-13 03:52:27.749165
11	MILO (DELETED-1781297548894)	Pcs	179.000	10.000	IG-011-DEL-1781297548894	MINUMAN	15000.00	\N	\N			100.00	15000.00	1.000	Gram	f	BAR	f	SHIFT	f	\N	\N	\N	\N	2026-06-12 11:29:48.711078	2026-06-13 03:52:28.965063	2026-06-13 03:52:28.965063
9	TARO (DELETED-1781297553566)	Pcs	57.000	10.000	IG-009-DEL-1781297553566	MINUMAN	15000.00	\N	\N			100.00	15000.00	1.000	Gram	f	BAR	f	SHIFT	f	\N	\N	\N	\N	2026-06-12 11:22:56.217878	2026-06-13 03:52:33.574184	2026-06-13 03:52:33.574184
6	BUBBLEGUM (DELETED-1781297559276)	Pcs	6.000	10.000	IG-006-DEL-1781297559276	MINUMAN	15000.00	\N	\N			100.00	15000.00	1.000	Gram	f	BAR	f	SHIFT	f	\N	\N	\N	\N	2026-06-12 11:21:34.898577	2026-06-13 03:52:39.315432	2026-06-13 03:52:39.315432
3	COOKIES N CREAM (DELETED-1781297573205)	Pcs	17.000	10.000	IG-003-DEL-1781297573205	MINUMAN	15000.00	\N	\N			100.00	15000.00	1.000	Gram	f	BAR	f	SHIFT	f	\N	\N	\N	\N	2026-06-12 11:19:53.333033	2026-06-13 03:52:53.221787	2026-06-13 03:52:53.221787
2	MATCHA (DELETED-1781297575518)	Pcs	51.000	10.000	IG-002-DEL-1781297575518	MINUMAN	15000.00	\N	\N			100.00	15000.00	1.000	Gram	f	BAR	f	SHIFT	f	\N	\N	\N	\N	2026-06-12 11:19:20.480098	2026-06-13 03:52:55.559925	2026-06-13 03:52:55.559925
1	THAITEA (DELETED-1781297577707)	Pcs	51.000	10.000	IG-001-DEL-1781297577707	MINUMAN	15000.00	\N	\N			100.00	15000.00	1.000	Gram	f	BAR	f	SHIFT	f	\N	\N	\N	\N	2026-06-12 11:18:42.759164	2026-06-13 03:52:57.723373	2026-06-13 03:52:57.723373
29	CINCAU CAP PANDA (DELETED-1781297500129)	Pcs	5.000	10.000	IG-029-DEL-1781297500129	MINUMAN	8000.00	\N	\N			100.00	8000.00	1.000	Gram	f	BAR	f	SHIFT	f	\N	\N	\N	\N	2026-06-12 12:22:20.640815	2026-06-13 03:51:40.149467	2026-06-13 03:51:40.149467
27	GREENSAND (DELETED-1781297506496) (DELETED-1781297506580)	Pcs	5.000	10.000	IG-027-DEL-1781297506496-DEL-1781297506580	MINUMAN	9000.00	\N	\N			100.00	9000.00	1.000	Gram	f	BAR	f	SHIFT	f	\N	\N	\N	\N	2026-06-12 12:20:45.509997	2026-06-13 03:51:46.597148	2026-06-13 03:51:46.597148
23	POWERADE (DELETED-1781297518088)	Pcs	16.000	10.000	IG-023-DEL-1781297518088	MINUMAN	8000.00	\N	\N			100.00	8000.00	1.000	Gram	f	BAR	f	SHIFT	f	\N	\N	\N	\N	2026-06-12 12:12:22.07225	2026-06-13 03:51:58.124137	2026-06-13 03:51:58.124137
20	MINERAL (DELETED-1781297527516)	Pcs	1326.000	30.000	IG-020-DEL-1781297527516	MINUMAN	6000.00	\N	\N			100.00	6000.00	1.000	Gram	f	BAR	f	SHIFT	f	\N	\N	\N	\N	2026-06-12 12:10:49.604036	2026-06-13 03:52:07.56986	2026-06-13 03:52:07.56986
16	ICE AMERICANO (DELETED-1781297539247)	Pcs	209.000	30.000	IG-016-DEL-1781297539247	MINUMAN	15000.00	\N	\N			100.00	15000.00	1.000	Gram	f	BAR	f	SHIFT	f	\N	\N	\N	\N	2026-06-12 11:55:57.751807	2026-06-13 03:52:19.272128	2026-06-13 03:52:19.272128
13	TEH PANAS (DELETED-1781297545835)	Pcs	10000.000	10.000	IG-013-DEL-1781297545835	MINUMAN	10000.00	\N	\N			100.00	10000.00	1.000	Gram	f	BAR	f	SHIFT	f	\N	\N	\N	\N	2026-06-12 11:54:28.918047	2026-06-13 03:52:25.869179	2026-06-13 03:52:25.869179
10	EXPRESSO (DELETED-1781297550800)	Pcs	209.000	30.000	IG-010-DEL-1781297550800	MINUMAN	15000.00	\N	\N			100.00	15000.00	1.000	Gram	f	BAR	f	SHIFT	f	\N	\N	\N	\N	2026-06-12 11:24:50.206295	2026-06-13 03:52:30.827343	2026-06-13 03:52:30.827343
7	STRAWBERRY BUBBLEGUM (DELETED-1781297556530)	Pcs	9.000	10.000	IG-007-DEL-1781297556530	MINUMAN	15000.00	\N	\N			100.00	15000.00	1.000	Gram	f	BAR	f	SHIFT	f			0.00	0.00	2026-06-12 11:22:05.004632	2026-06-13 03:52:36.57394	2026-06-13 03:52:36.57394
5	REDVELVET (DELETED-1781297566438)	Pcs	63.000	10.000	IG-005-DEL-1781297566438	MINUMAN	15000.00	\N	\N			100.00	15000.00	1.000	Gram	f	BAR	f	SHIFT	f	\N	\N	\N	\N	2026-06-12 11:20:58.890679	2026-06-13 03:52:46.477962	2026-06-13 03:52:46.477962
4	CAPUCINO (DELETED-1781297570286) (DELETED-1781297570396)	Pcs	56.000	10.000	IG-004-DEL-1781297570286-DEL-1781297570396	MINUMAN	15000.00	\N	\N			100.00	15000.00	1.000	Gram	f	BAR	f	SHIFT	f	\N	\N	\N	\N	2026-06-12 11:20:26.886418	2026-06-13 03:52:50.450507	2026-06-13 03:52:50.450507
61	GULA AREN (DELETED-1781299967096)	Pcs	49.000	2.000	IG-012-DEL-1781299967096	Packaging	0.00	\N	\N			100.00	\N	\N	\N	f	CASHIER	f	SHIFT	f	\N	\N	\N	\N	2026-06-13 04:11:04.032294	2026-06-13 04:32:47.11872	2026-06-13 04:32:47.11872
60	PANDAN COFFEE (DELETED-1781299968060)	Pcs	49.000	2.000	IG-011-DEL-1781299968060	Packaging	0.00	\N	\N			100.00	\N	\N	\N	f	CASHIER	f	SHIFT	f	\N	\N	\N	\N	2026-06-13 04:09:19.56977	2026-06-13 04:32:48.079492	2026-06-13 04:32:48.079492
59	SALTED CARAMEL (DELETED-1781299969337)	Pcs	49.000	2.000	IG-010-DEL-1781299969337	Packaging	0.00	\N	\N			100.00	\N	\N	\N	f	CASHIER	f	SHIFT	f	\N	\N	\N	\N	2026-06-13 04:07:55.363037	2026-06-13 04:32:49.378194	2026-06-13 04:32:49.378194
58	CAPPUCINO (DELETED-1781299970603)	Gram	54.000	2.000	IG-009-DEL-1781299970603	Packaging	0.00	\N	\N			100.00	\N	\N	\N	f	CASHIER	f	SHIFT	f			0.00	0.00	2026-06-13 04:06:31.763319	2026-06-13 04:32:50.64061	2026-06-13 04:32:50.64061
57	COOKIES & CREAM (DELETED-1781299971445)	Pcs	27.000	2.000	IG-008-DEL-1781299971445	Packaging	0.00	\N	\N			100.00	\N	\N	\N	f	CASHIER	f	SHIFT	f	\N	\N	\N	\N	2026-06-13 04:05:09.915371	2026-06-13 04:32:51.471846	2026-06-13 04:32:51.471846
56	TARO (DELETED-1781299974549)	Pcs	55.000	2.000	IG-007-DEL-1781299974549	Packaging	0.00	\N	\N			100.00	\N	\N	\N	f	CASHIER	f	SHIFT	f	\N	\N	\N	\N	2026-06-13 04:04:13.971802	2026-06-13 04:32:54.572712	2026-06-13 04:32:54.572712
55	THAI TEA (DELETED-1781299976151)	Pcs	51.000	2.000	IG-006-DEL-1781299976151	Packaging	0.00	\N	\N			100.00	\N	\N	\N	f	CASHIER	f	SHIFT	f	\N	\N	\N	\N	2026-06-13 04:02:53.633963	2026-06-13 04:32:56.176584	2026-06-13 04:32:56.176584
53	MATCHA (DELETED-1781299977334) (DELETED-1781299977453)	Pcs	46.000	2.000	IG-005-DEL-1781299977334-DEL-1781299977453	Packaging	0.00	\N	\N			100.00	\N	\N	\N	f	CASHIER	f	SHIFT	f	\N	\N	\N	\N	2026-06-13 04:01:53.151088	2026-06-13 04:32:57.463983	2026-06-13 04:32:57.463983
52	PERMEN KARET (DELETED-1781299978801)	Pcs	5.000	2.000	IG-004-DEL-1781299978801	Packaging	0.00	\N	\N			100.00	\N	\N	\N	f	CASHIER	f	SHIFT	f	\N	\N	\N	\N	2026-06-13 04:00:29.854551	2026-06-13 04:32:58.830619	2026-06-13 04:32:58.830619
51	STRAWBERRY BUBBLEGUM (DELETED-1781299980247)	Pcs	8.000	2.000	IG-003-DEL-1781299980247	Packaging	0.00	\N	\N			100.00	\N	\N	\N	f	CASHIER	f	SHIFT	f	\N	\N	\N	\N	2026-06-13 03:59:27.98265	2026-06-13 04:33:00.29573	2026-06-13 04:33:00.29573
50	RICH CHOCO (DELETED-1781299981095)	Pcs	55.000	2.000	IG-002-DEL-1781299981095	Packaging	0.00	\N	\N			100.00	\N	\N	\N	f	CASHIER	f	SHIFT	f	\N	\N	\N	\N	2026-06-13 03:56:35.102826	2026-06-13 04:33:01.109813	2026-06-13 04:33:01.109813
\.


--
-- Data for Name: inventory_waste; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.inventory_waste (id, "ingredientId", quantity, valuation, reason, status, "recordedByUserId", "businessDayId", "imageUrl", "createdAt", "deletedAt") FROM stdin;
\.


--
-- Data for Name: locker_sessions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.locker_sessions (id, "lockerId", "customerName", phone, "identityNumber", "pinHash", "memberId", "memberName", "isMemberFree", price, "startTime", "endTime", status, "handledByName", "handledById", "failedPinAttempts", "isLocked", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: lockers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.lockers (id, number, label, "categoryId", status, "macAddress", "relayPin", "isActive", "pricePerHour", notes, "createdAt", "updatedAt", "deletedAt") FROM stdin;
\.


--
-- Data for Name: member_missions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.member_missions (id, "memberId", "missionId", "currentValue", "isCompleted", "isClaimed", "updatedAt") FROM stdin;
\.


--
-- Data for Name: member_tiers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.member_tiers (id, name, "discountConfig", "activeStartTime", "activeEndTime", "pointMultiplier", "activeDates", "activeDays", "isActive", "autoUpgradeSpend", "minimumTopUp", "birthdayDiscountPct", "doublePointDays", "bonusTopupConfig", "freeItemTrigger", "referralBonusPoints", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: members; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.members (id, "rfidUid", name, "memberCode", phone, balance, "discountPercentage", "tierId", "expiryDate", "securityVersion", "isActive", points, "targetWinRate", "totalSpend", "birthDate", "referralCode", "referredById", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: menu_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.menu_items (id, name, "categoryId", "productionTarget", "expiryDate", sku, description, "imageUrl", price, "isActive", "taxPercentage", "stockQuantity", "minStockLevel", "isSubRecipe", "yieldPercentage", "isMandatoryReporting", department, "isHighValue", "auditFrequency", "createdAt", "updatedAt", "deletedAt") FROM stdin;
\.


--
-- Data for Name: missions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.missions (id, title, description, code, "rewardPoints", "targetValue", "isActive", icon, "createdAt") FROM stdin;
1	Daily Breecher	Main game apapun 3 kali hari ini	PLAY_ANY_GAME	5	3	t	Trophy	2026-06-12 02:32:02.284168
2	Bom Hunter	Main Scratch Bomb 5 kali	PLAY_SCRATCH	10	5	t	Target	2026-06-12 02:32:02.284168
3	Whale Apprentice	Capai total bet 50 poin	ACCUMULATE_BET	25	50	t	Zap	2026-06-12 02:32:02.284168
\.


--
-- Data for Name: order_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.order_items (id, status, "transactionId", "menuItemId", quantity, "priceAtOrder", "discountPercentage", "discountAmount", "isPaid", "paymentId", note, "customName", station, "bundleGroupId", "cancelledAt", "cancelledBy", "cancelReason", "completedByUserId", "completedAt", "createdByUserId", "commissionUserId", "payrollReleaseId", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: order_items_archive; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.order_items_archive (id, status, "transactionId", "menuItemId", quantity, "priceAtOrder", "discountPercentage", "discountAmount", "isPaid", "paymentId", note, "customName", station, "bundleGroupId", "cancelledAt", "cancelledBy", "cancelReason", "completedByUserId", "completedAt", "createdByUserId", "commissionUserId", "payrollReleaseId", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: payroll_configs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.payroll_configs (id, "basicSalary", "overtimeRate", "commissionService", "commissionSalesPercent", "categoryCommissions", "penaltyLate", "penaltyIdle", "idleThreshold", "userId") FROM stdin;
2	0.00	0.00	0.00	0.00	{}	0.00	0.00	0	2
4	0.00	0.00	0.00	0.00	{}	0.00	0.00	0	4
3	0.00	0.00	0.00	0.00	{}	0.00	0.00	0	3
5	0.00	0.00	0.00	0.00	{}	0.00	0.00	0	5
1	0.00	0.00	0.00	0.00	{}	0.00	0.00	0	1
\.


--
-- Data for Name: payroll_releases; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.payroll_releases (id, "userId", month, year, "basicSalary", "commissionService", "commissionSales", "commissionProduction", penalties, "totalPayout", details, "releasedAt", "releasedByUserId", "createdAt") FROM stdin;
\.


--
-- Data for Name: point_ledgers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.point_ledgers (id, "memberId", type, amount, description, "referenceId", "createdAt") FROM stdin;
\.


--
-- Data for Name: point_rewards; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.point_rewards (id, name, category, "pointCost", stock, "isActive", image, "menuItemId", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: printers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.printers (id, name, "connectionType", "ipAddress", port, type, floor, "coverageZones", "isActive", "isOnline", "isBackup", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: product_finances; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.product_finances (id, "menuItemId", "baseHpp", "targetMarginPercent", "targetMarkupFixed", "targetMarkupPercent", "targetMultiplier", "maxHppThreshold", "pricingAdvice", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: promos; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.promos (id, name, type, description, "isActive", "startDate", "endDate", "ruleJson", "usageCount", "totalRevenueContribution", "totalProfitContribution", "estimatedHpp", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: public_holidays; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.public_holidays (id, name, date, "isClosure", "createdAt") FROM stdin;
\.


--
-- Data for Name: push_subscriptions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.push_subscriptions (id, endpoint, keys, "userId", "createdAt") FROM stdin;
08b73a03-a9f0-485d-80fc-bc85693644f2	https://web.push.apple.com/QAvPVtLsqpeVFRgNX4MSbytQvIkTN8ZzCjveFjvu2f37bYPr0tvyZ00HHydN53gx6UldGX6xuie0TyIzJAqjdxvSqt19aawIsqH8tGDbXUQFwB8VSbv7RpLDNgAdMeMD_byrEiYVR8A5VS_r3fdTV7ZhSsB-twA4fmlB3qZy1UQ	{"p256dh":"BGQY8hxnLLZm0nDmFY3tenRszF-6g4aMMr2g-3ASK3Il6LPu1rmMEEa-wYyVNWSThjk2-Q48BvdeffksLLyPqGI","auth":"gedkWleq_YRvproNcMnEIA"}	1	2026-06-12 13:18:15.619067
9db19360-9d70-4229-a123-b6acdefdae99	https://fcm.googleapis.com/fcm/send/e2ZMCRwVf3g:APA91bGi6pMQ7011VGMy0PoMvB53W9-Oz5yo1_KZ7m05VHj4HjESPhH3MsMen7N7O9gR8RFcCuMjYV68i2M49gzkV5U_TBX8j0gOxFCiBAyYZYIOsHxZfzK0lYaoCKO_tKqxWPoL908s	{"p256dh":"BCFzDkZ77GTGEHovwDlCxX8R77FvqRGIWW5Yy27Z1QI2FRmJjxRFt5aF2As_LykONYCOoBbUeU3jT5aG79FFu6E","auth":"XakcRn9r9FdhYPgtpt-LOg"}	5	2026-06-13 01:04:37.586801
f52d49e6-fc24-418a-9e6b-c2470271e218	https://fcm.googleapis.com/fcm/send/eUGPEtUauXw:APA91bFmz52ozua4O3azUVoyf61qjB8yhTMaKHT8ycd_qa2lEDtWFfZU_emjRhsYFxXQeLzcdzYcdtIJW2vtjRAzDLHQ6GnYck--1qs7q5q1O9VPsogZXAE7xbUTgWyE-Tt2IhryxK9h	{"p256dh":"BD_EHPj_fg79En1Xv54r9Nft_ScC1OogYcHAv-eK8awZUzql_Ovdg2KjuYvKdCKutsnQgSg6Fj1uV-Y68l8lOiw","auth":"tLXpQnhQbZhlBtK5Y9HUZw"}	5	2026-06-13 01:04:58.496131
\.


--
-- Data for Name: recipes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.recipes (id, "menuItemId", "ingredientId", "subMenuItemId", quantity, unit) FROM stdin;
\.


--
-- Data for Name: roles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.roles (id, name, permissions, "approvalLevel", description) FROM stdin;
1	SUPERADMIN	["DASHBOARD_TABLE","ACCESS_KDS","ACCESS_BDS","BILLIARD_PRICING","PROMO_MANAGE","BUSINESS_DAY_VIEW","BUSINESS_DAY_CLOSE","SHIFT_START","WAITING_LIST_VIEW","WAITING_LIST_MANAGE","DASHBOARD_STATS_VIEW","DASHBOARD_CHART_VIEW","MEMBER_VIEW","MEMBER_MANAGE","MEMBER_TOPUP","CUSTOMER_FEEDBACK","BILLIARD_VIEW","BILLIARD_CARD_VIEW","BILLIARD_START","BILLIARD_EXTEND","BILLIARD_STOP","BILLIARD_PAY","BILLIARD_MOVE","BILLIARD_LIGHT","BILLIARD_ORDER","BILLIARD_CANCEL_ITEM","BILLIARD_PREVIEW","BILLIARD_SWITCH","BILLIARD_MANAGE_TABLES","ORDER_CREATE","ORDER_EDIT","ORDER_CANCEL","ORDER_DISCOUNT","ORDER_VOID","PAYMENT_PROCESS","PAYMENT_REFUND","CAFE_VIEW","CAFE_CARD_VIEW","CAFE_START","CAFE_ORDER","CAFE_PAY","CAFE_TRANSFER","CAFE_CANCEL_ITEM","POS_ORDER_CREATE","POS_PAYMENT","POS_SHIFT","INV_VIEW","INVENTORY_WASTE","INV_ADD_ITEM","INVENTORY_STOCK_IN","INVENTORY_STOCK_OUT","INVENTORY_RECEIVE","INV_EDIT_ITEM","INV_DELETE_ITEM","INV_RECIPE","INV_ADD_MENU","INV_EDIT_MENU","INV_DELETE_MENU","INV_TOGGLE_MENU","INV_ALERT","INVENTORY_STOCK_ADJUST","INVENTORY_SUPPLIER_MANAGE","STOCK_TRANSFER","STOCK_OPNAME","KDS_VIEW","KDS_PROCESS","KDS_SET_READY","KDS_HISTORY","BDS_VIEW","BDS_PROCESS","BDS_SET_READY","BDS_HISTORY","FIN_REVENUE","FIN_EXPENSES_VIEW","FIN_EXPENSES_ADD","FIN_LEDGER","FIN_PRINT_REPRINT","FIN_DEBTS","REPORT_EXPORT","AR_LIST_VIEW","AR_PAYMENT","AR_SETTLE","SHIFT_REPORT","USER_MANAGE","USER_EDIT","USER_DELETE","USER_VIOLATION","USER_ROLE","USER_MONITOR","USER_FORCE_LOGOUT","AUDIT_VIEW","AUDIT_EXPORT","PAYROLL_VIEW","SHIFT_MANAGE","APPROVAL_OVERRIDE","USER_ROLE_EDIT","APPROVAL_VIEW","APPROVAL_ACTION","SETTING_IDENTITY","SETTING_POLICY","SETTING_OPERATION","SETTING_APPROVAL","SETTING_HARDWARE","SETTING_FIRMWARE","SETTING_INVOICE","SETTING_DATABASE","SETTING_WHATSAPP","SETTING_LICENSE","SETTING_TABLES","TABLE_CREATE","TABLE_EDIT","TABLE_DELETE","PROMO_APPLY","SETTING_DISPLAY","SETTING_GAMIFICATION","SETTING_PREFERENCES","SYSTEM_CLEANUP","SYSTEM_BACKUP","WEBSOCKET_MONITOR","MQTT_MONITOR","IOT_CONTROL","IOT_MONITOR","ERROR_LOGS","DEBUG_TOOLS","EXPERIMENTAL_FEATURES","DATABASE_SYNC","API_KEYS_MANAGE","USER_SESSIONS","NOTIFICATION_MANAGE","VOUCHER_MANAGE","VOUCHER_REDEEM","START_TABLE","MOVE_TABLE","SWITCH_PACKAGE","SET_PRICE","VOID_BILLING","VIEW_MENU","ORDER_MENU","MANAGE_RETAIL","VOID_ORDER","VIEW_INVENTORY","UPDATE_INVENTORY","MANAGE_RECIPE","STOCK_ALERT","VIEW_REVENUE","VIEW_PROFIT_LOSS","MANAGE_EXPENSES","REPRINT_INVOICE","MANAGE_EMPLOYEES","MANAGE_PAYROLL","MONITOR_ACTIVITY","FORCE_LOGOUT","TABLE_CONTROL_PANEL","AI_ARME_GAMIFICATION","GAMIFICATION_ANALYTICS","SCAN_REDEMPTION","REWARDS_CATALOG","LOCKER_MANAGE"]	3	
2	KITCHEN	["ACCESS_KDS"]	0	Kitchen (KDS Only)
3	KASIR	["DASHBOARD_VIEW","DASHBOARD_TABLE","STOP_TABLE","CAFE_ORDER","CAFE_VIEW","BILLING_VIEW","PAYMENT_PROCESS","TABLE_MANAGE","BILLIARD_PRICING","WAITING_LIST_MANAGE","WAITING_LIST_VIEW","MEMBER_VIEW","MEMBER_MANAGE","MEMBER_TOPUP","CUSTOMER_FEEDBACK","BILLIARD_VIEW","BILLIARD_CARD_VIEW","BILLIARD_START","BILLIARD_EXTEND","BILLIARD_STOP","BILLIARD_PAY","BILLIARD_MOVE","BILLIARD_LIGHT","BILLIARD_ORDER","BILLIARD_CANCEL_ITEM","BILLIARD_PREVIEW","BILLIARD_SWITCH","BILLIARD_MANAGE_TABLES","CAFE_CARD_VIEW","CAFE_START","CAFE_PAY","CAFE_TRANSFER","CAFE_CANCEL_ITEM","POS_ORDER_CREATE","POS_PAYMENT","POS_SHIFT","ORDER_CREATE","ORDER_EDIT","ORDER_CANCEL","ORDER_DISCOUNT","ORDER_VOID","PAYMENT_REFUND","ACCESS_KDS","ACCESS_BDS","KDS_VIEW","KDS_PROCESS","KDS_SET_READY","KDS_HISTORY","BDS_VIEW","BDS_PROCESS","BDS_SET_READY","BDS_HISTORY","INV_VIEW","INVENTORY_WASTE","INV_ADD_ITEM","INVENTORY_STOCK_IN","INVENTORY_STOCK_OUT","INVENTORY_RECEIVE","INV_EDIT_ITEM","INV_DELETE_ITEM","INV_RECIPE","INV_ADD_MENU","INV_EDIT_MENU","INV_DELETE_MENU","INV_TOGGLE_MENU","INV_ALERT","INVENTORY_STOCK_ADJUST","INVENTORY_SUPPLIER_MANAGE","STOCK_TRANSFER","STOCK_OPNAME","FIN_EXPENSES_ADD","FIN_EXPENSES_VIEW","FIN_PRINT_REPRINT","FIN_DEBTS","BUSINESS_DAY_VIEW","BUSINESS_DAY_CLOSE","AR_LIST_VIEW","AR_PAYMENT","AR_SETTLE","SHIFT_START","APPROVAL_VIEW","APPROVAL_ACTION","FIN_LEDGER","START_TABLE","MOVE_TABLE","SWITCH_PACKAGE","VOID_BILLING","VIEW_MENU","ORDER_MENU","MANAGE_RETAIL","VOID_ORDER","REPRINT_INVOICE","VOUCHER_MANAGE","VOUCHER_REDEEM","TABLE_CONTROL_PANEL"]	1	Kasir (Full Billiard & Cafe)
4	akun super	["DASHBOARD_TABLE","WAITING_LIST_VIEW","WAITING_LIST_MANAGE","MEMBER_VIEW","MEMBER_MANAGE","MEMBER_TOPUP","CUSTOMER_FEEDBACK","BILLIARD_VIEW","BILLIARD_CARD_VIEW","BILLIARD_START","BILLIARD_EXTEND","BILLIARD_STOP","BILLIARD_PAY","BILLIARD_MOVE","BILLIARD_LIGHT","BILLIARD_ORDER","BILLIARD_CANCEL_ITEM","BILLIARD_PREVIEW","BILLIARD_PRICING","BILLIARD_SWITCH","CAFE_VIEW","CAFE_CARD_VIEW","CAFE_START","CAFE_ORDER","CAFE_PAY","CAFE_TRANSFER","CAFE_CANCEL_ITEM","POS_ORDER_CREATE","POS_PAYMENT","POS_SHIFT","ORDER_CREATE","ORDER_EDIT","ORDER_CANCEL","ORDER_DISCOUNT","ORDER_VOID","PAYMENT_PROCESS","PAYMENT_REFUND","ACCESS_KDS","ACCESS_BDS","KDS_VIEW","KDS_PROCESS","KDS_SET_READY","KDS_HISTORY","BDS_VIEW","BDS_PROCESS","BDS_SET_READY","BDS_HISTORY","INV_VIEW","INVENTORY_WASTE","INV_ADD_ITEM","INVENTORY_STOCK_IN","INVENTORY_STOCK_OUT","INVENTORY_RECEIVE","INV_EDIT_ITEM","INV_DELETE_ITEM","INV_RECIPE","INV_ADD_MENU","INV_EDIT_MENU","INV_DELETE_MENU","INV_TOGGLE_MENU","INV_ALERT","INVENTORY_STOCK_ADJUST","INVENTORY_SUPPLIER_MANAGE","STOCK_TRANSFER","STOCK_OPNAME","FIN_EXPENSES_VIEW","FIN_EXPENSES_ADD","FIN_LEDGER","FIN_PRINT_REPRINT","FIN_DEBTS","BUSINESS_DAY_VIEW","BUSINESS_DAY_CLOSE","REPORT_EXPORT","AR_LIST_VIEW","AR_PAYMENT","AR_SETTLE","SHIFT_REPORT","USER_FORCE_LOGOUT","PROMO_MANAGE","PROMO_APPLY","START_TABLE","MOVE_TABLE","SWITCH_PACKAGE","SET_PRICE","VOID_BILLING","VIEW_MENU","ORDER_MENU","MANAGE_RETAIL","VOID_ORDER","VIEW_INVENTORY","UPDATE_INVENTORY","MANAGE_RECIPE","STOCK_ALERT","MANAGE_EXPENSES","REPRINT_INVOICE","MANAGE_EMPLOYEES","MANAGE_PAYROLL","MONITOR_ACTIVITY","FORCE_LOGOUT","SCAN_REDEMPTION","REWARDS_CATALOG","LOCKER_MANAGE","VOUCHER_REDEEM","VOUCHER_MANAGE","NOTIFICATION_MANAGE","USER_SESSIONS","FIN_REVENUE","DASHBOARD_CHART_VIEW","DASHBOARD_STATS_VIEW","APPROVAL_OVERRIDE","USER_ROLE_EDIT","APPROVAL_ACTION","APPROVAL_VIEW","SETTING_IDENTITY","SETTING_POLICY","SETTING_OPERATION","SETTING_APPROVAL","SETTING_LICENSE","TABLE_CONTROL_PANEL","USER_VIOLATION","USER_ROLE","USER_MONITOR","AUDIT_VIEW","AUDIT_EXPORT","PAYROLL_VIEW","SHIFT_MANAGE","BILLIARD_MANAGE_TABLES","SETTING_INVOICE","SETTING_TABLES","SETTING_PREFERENCES","IOT_CONTROL","VIEW_REVENUE","VIEW_PROFIT_LOSS","USER_MANAGE"]	2	
\.


--
-- Data for Name: sessions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sessions (id, "memberId", "sessionType", "startTime", "endTime", "durationMinutes", "totalPrice", "isPaid", "createdAt", "updatedAt", "tableId") FROM stdin;
1	\N	open	2026-06-12 10:12:57.425	2026-06-12 11:27:24.068	74	0.00	f	2026-06-12 11:27:24.069581	2026-06-12 11:27:24.069581	1
2	\N	prepaid	2026-06-12 11:26:48.878	2026-06-12 13:26:48.949	120	0.00	f	2026-06-12 13:26:48.950217	2026-06-12 13:26:48.950217	5
3	\N	open	2026-06-12 11:39:11.52	2026-06-12 13:50:38.743	131	0.00	f	2026-06-12 13:50:38.745698	2026-06-12 13:50:38.745698	7
4	\N	prepaid	2026-06-12 12:51:58.948	2026-06-12 13:51:59.079	60	0.00	f	2026-06-12 13:51:59.082913	2026-06-12 13:51:59.082913	2
5	\N	prepaid	2026-06-12 11:05:48.617	2026-06-12 14:05:48.7	180	0.00	f	2026-06-12 14:05:48.703241	2026-06-12 14:05:48.703241	6
6	\N	prepaid	2026-06-12 14:11:02.657	2026-06-12 15:11:02.722	60	0.00	f	2026-06-12 15:11:02.724412	2026-06-12 15:11:02.724412	6
7	\N	prepaid	2026-06-12 12:56:53.322	2026-06-12 15:56:53.421	180	0.00	f	2026-06-12 15:56:53.422353	2026-06-12 15:56:53.422353	1
8	\N	prepaid	2026-06-12 13:58:46.15	2026-06-12 15:58:46.218	120	0.00	f	2026-06-12 15:58:46.219044	2026-06-12 15:58:46.219044	5
9	\N	prepaid	2026-06-12 16:44:35.7	2026-06-12 17:44:35.796	60	0.00	f	2026-06-12 17:44:35.797553	2026-06-12 17:44:35.797553	1
10	\N	prepaid	2026-06-12 15:33:21.472	2026-06-12 18:33:21.596	180	0.00	f	2026-06-12 18:33:21.597365	2026-06-12 18:33:21.597365	9
11	\N	prepaid	2026-06-12 17:00:26.293	2026-06-12 19:00:26.365	120	0.00	f	2026-06-12 19:00:26.367936	2026-06-12 19:00:26.367936	10
12	\N	prepaid	2026-06-12 15:33:21.472	2026-06-12 19:34:04.464	241	0.00	f	2026-06-12 19:34:04.470048	2026-06-12 19:34:04.470048	9
13	\N	open	2026-06-12 19:10:07.488	2026-06-12 20:10:06.159	60	0.00	f	2026-06-12 20:10:06.159992	2026-06-12 20:10:06.159992	1
14	\N	open	2026-06-12 19:11:29.228	2026-06-12 20:11:30.728	60	0.00	f	2026-06-12 20:11:30.729538	2026-06-12 20:11:30.729538	8
15	\N	open	2026-06-12 19:02:25.502	2026-06-12 21:02:25.335	120	0.00	f	2026-06-12 21:02:25.34114	2026-06-12 21:02:25.34114	4
16	\N	prepaid	2026-06-12 19:11:49.046	2026-06-12 21:11:49.11	120	0.00	f	2026-06-12 21:11:49.115607	2026-06-12 21:11:49.115607	10
17	\N	prepaid	2026-06-12 19:40:30.86	2026-06-12 21:40:30.916	120	0.00	f	2026-06-12 21:40:30.917543	2026-06-12 21:40:30.917543	2
18	\N	prepaid	2026-06-12 18:53:32.204	2026-06-12 21:53:32.274	180	0.00	f	2026-06-12 21:53:32.275975	2026-06-12 21:53:32.275975	3
19	\N	prepaid	2026-06-12 18:56:42.905	2026-06-12 21:56:42.942	180	0.00	f	2026-06-12 21:56:42.943962	2026-06-12 21:56:42.943962	12
20	\N	prepaid	2026-06-12 20:58:38.085	2026-06-12 21:58:38.253	60	0.00	f	2026-06-12 21:58:38.256018	2026-06-12 21:58:38.256018	7
21	\N	prepaid	2026-06-12 20:21:56.093	2026-06-12 22:21:56.152	120	0.00	f	2026-06-12 22:21:56.15332	2026-06-12 22:21:56.15332	8
22	\N	prepaid	2026-06-12 19:40:30.86	2026-06-12 22:42:05.282	182	0.00	f	2026-06-12 22:42:05.283949	2026-06-12 22:42:05.283949	2
23	\N	open	2026-06-12 21:56:22.751	2026-06-12 22:56:22.032	60	0.00	f	2026-06-12 22:56:22.033259	2026-06-12 22:56:22.033259	1
24	\N	prepaid	2026-06-12 20:17:47.648	2026-06-12 23:17:47.778	180	0.00	f	2026-06-12 23:17:47.779689	2026-06-12 23:17:47.779689	6
25	\N	prepaid	2026-06-12 20:21:56.093	2026-06-12 23:22:24.576	180	0.00	f	2026-06-12 23:22:24.57754	2026-06-12 23:22:24.57754	8
26	\N	prepaid	2026-06-12 21:23:44.328	2026-06-12 23:23:44.376	120	0.00	f	2026-06-12 23:23:44.377592	2026-06-12 23:23:44.377592	5
27	\N	prepaid	2026-06-12 22:23:18.954	2026-06-12 23:46:18.276	83	0.00	f	2026-06-12 23:46:18.277905	2026-06-12 23:46:18.277905	7
28	\N	prepaid	2026-06-12 23:16:37.629	2026-06-13 00:16:37.675	60	0.00	f	2026-06-13 00:16:37.675649	2026-06-13 00:16:37.675649	2
29	\N	prepaid	2026-06-12 23:25:35.241	2026-06-13 00:25:35.38	60	0.00	f	2026-06-13 00:25:35.382266	2026-06-13 00:25:35.382266	6
30	\N	prepaid	2026-06-12 23:31:02.063	2026-06-13 00:31:02.127	60	0.00	f	2026-06-13 00:31:02.128595	2026-06-13 00:31:02.128595	8
31	\N	prepaid	2026-06-12 22:45:43.697	2026-06-13 00:45:43.766	120	0.00	f	2026-06-13 00:45:43.76787	2026-06-13 00:45:43.76787	4
32	\N	prepaid	2026-06-13 01:06:56.229	2026-06-13 01:07:11.387	0	0.00	f	2026-06-13 01:07:11.38834	2026-06-13 01:07:11.38834	2
33	\N	open	2026-06-12 23:11:08.199	2026-06-13 01:18:37.921	127	0.00	f	2026-06-13 01:18:37.922381	2026-06-13 01:18:37.922381	1
34	\N	open	2026-06-13 00:49:44.25	2026-06-13 01:49:01.332	59	0.00	f	2026-06-13 01:49:01.33318	2026-06-13 01:49:01.33318	4
35	\N	open	2026-06-13 00:59:20.564	2026-06-13 02:11:20.197	72	0.00	f	2026-06-13 02:11:20.198095	2026-06-13 02:11:20.198095	5
36	\N	open	2026-06-13 01:24:05.888	2026-06-13 03:08:17.552	104	0.00	f	2026-06-13 03:08:17.553747	2026-06-13 03:08:17.553747	1
37	\N	open	2026-06-12 22:36:33.828	2026-06-13 03:22:44.137	286	0.00	f	2026-06-13 03:22:44.138247	2026-06-13 03:22:44.138247	3
\.


--
-- Data for Name: settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.settings (id, "businessName", address, contact, "socialMediaLink", "logoPath", "ppnPercentage", "serviceChargePercentage", "roundingKelipatan", "businessDayOffset", "autoMaintenanceTime", "availablePaymentMethods", "mqttBrokerAddress", "tftWallpaper", "invoiceBusinessName", "invoiceAddress", "invoiceContact", "invoiceSocialMedia", "invoiceFooterNote", "customPricingDynamic", "availableShifts", "shiftEndingWarningMinutes", "endingSoonThreshold", "balanceBuffer", "balanceWarningMinutes", "royaltyPointsPerAmount", "royaltyPointRedeemValue", "scratchBombWinRate", "scratchBombRewards", "scratchBombAvgWinPts", "gamificationAutoPilot", "gamificationTargetSurplus", "scratchBombPlayCost", "pointExpiryDays", "scratchBombPool", "mahjongSlotWinRate", "mahjongSlotPool", "isEmergencyMode", "printerWidth", "displayPromotions", "ownerPhone", "autoReportEnabled", "reportSchedule", "waTemplateWelcome", "aiStaffingRatio", "aiAutoPromote", "aiAutoPromoteThreshold", "waTemplateSessionEnd", "autoSettlementEnabled", "autoSettlementTime", "approvalConfig", "bounceBackConfig", "isIotBypassed") FROM stdin;
1	SCUFF BILLIARD	 Tulangan Tengah, Tulangan, Kec. Tulangan, Kabupaten Sidoarjo	0851-1770-5709	@scuffbilliard	/uploads/logos/logo-1781206637608-970143562.jpeg	0.00	0.00	100	03:00	03:00	["CASH","Qris","TRANSFER","GoPay","DANA","OVO","BCA","MANDIRI","BRI","BNI","SEABANK","SHOPEEPAY"]	127.0.0.1	\N	\N	\N	\N	\N	Periksa kembali nota anda, kami tidak menerima komplain \nsaat anda meningalkan area ini	[{"categoryId":1,"basePrice":0,"timeSlots":[{"start":"10:00","end":"18:00","price":35000},{"start":"18:00","end":"02:00","price":"40000"},{"start":"02:00","end":"10:00","price":"40000"}]},{"categoryId":2,"basePrice":0,"timeSlots":[{"start":"10:00","end":"18:00","price":"25000"},{"start":"18:00","end":"02:00","price":"30000"},{"start":"02:00","end":"10:00","price":"30000"}]},{"categoryId":3,"basePrice":0,"timeSlots":[{"start":"10:00","end":"18:00","price":"20000"},{"start":"18:00","end":"02:00","price":"25000"},{"start":"02:00","end":"10:00","price":"25000"}]}]	[{"name":"SHIFT 1","startTime":"10:00","endTime":"18:00"},{"name":"SHIFT 2","startTime":"18:00","endTime":"02:00"},{"name":"OVERTIME","startTime":"02:00","endTime":"10:00"}]	10	5	2000	15	1000	200	5	1,2,5,10,20,50,100	25	f	5000000	2	90	0	15	0	f	80	\N	\N	f	23:55	\N	5	f	0.60	\N	t	04:00	{"WASTE":[1,2],"EXPENSE":[1,2],"STOCK_UPDATE":[1,2],"PENALTY":[1,2],"CLOSING":[1,2],"DATA_EDIT":[1,2]}	[{"tierName":"Tier 1 - Pelanggan Reguler","minAmount":5000000,"maxAmount":100000,"rewardType":"FREE_ITEM","rewardValue":1,"minClaimTransaction":0,"expiryDays":7},{"tierName":"Tier 2 - Pelanggan Setia","minAmount":10000000,"maxAmount":250000,"rewardType":"DISCOUNT_FIXED","rewardValue":15000,"minClaimTransaction":50000,"expiryDays":14},{"tierName":"Tier 3 - Pelanggan VIP","minAmount":20000000,"maxAmount":99999999,"rewardType":"FREE_BILLIARD_MINUTES","rewardValue":60,"minClaimTransaction":0,"expiryDays":30}]	f
\.


--
-- Data for Name: shift_stock_reports; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.shift_stock_reports (id, "shiftId", "ingredientId", "menuItemId", "itemName", "systemStock", "physicalStock", discrepancy, "lostValue", unit, note, department, "createdAt") FROM stdin;
\.


--
-- Data for Name: shifts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.shifts (id, "userId", "businessDayId", "startTime", "shiftName", "endTime", "cashStart", "cashSystem", "cashPhysical", discrepancy, "totalTopUp", note, status, "startedBy", "endedBy", "approvalStatus", "isActive", "latenessMinutes", "overtimeMinutes", "assignedTableIds", "cashRevenue", "nonCashRevenue", "totalExpenses", "attachmentUrl", "performanceSummary", "stockReportStatus", "createdAt") FROM stdin;
1	3	1	2026-06-12 10:00:13.426	SHIFT 1	2026-06-12 17:04:06.413	500000.00	762000.00	262000.00	-500000.00	0.00	Shift closed	CLOSED	Kasir 1	Kasir 1	APPROVED	f	0	0	[{"type":"BILLIARD","id":1},{"type":"BILLIARD","id":2},{"type":"BILLIARD","id":3},{"type":"BILLIARD","id":4},{"type":"BILLIARD","id":5},{"type":"BILLIARD","id":6},{"type":"BILLIARD","id":7},{"type":"BILLIARD","id":8},{"type":"BILLIARD","id":9},{"type":"BILLIARD","id":10},{"type":"BILLIARD","id":11},{"type":"BILLIARD","id":12},{"type":"CAFE","id":1},{"type":"CAFE","id":2},{"type":"CAFE","id":3},{"type":"CAFE","id":4},{"type":"CAFE","id":5},{"type":"CAFE","id":6},{"type":"CAFE","id":7},{"type":"CAFE","id":8},{"type":"CAFE","id":9},{"type":"CAFE","id":10},{"type":"CAFE","id":11},{"type":"CAFE","id":12}]	262000.00	40000.00	0.00		{"totalTransactions":11,"topWaiters":[{"name":"Kasir 1","count":11}],"topPackages":[{"name":"1 JAM WEEKDAYS","count":9},{"name":"1 JAM WEEKEND","count":2},{"name":"OPEN TABLE WEEKDAYS","count":2},{"name":"3 JAM WEEKDAYS","count":1}],"topPromos":[],"topItems":[],"billiardRevenue":462000,"cafeRevenue":0,"topupRevenue":0}	\N	2026-06-12 10:00:13.427586
2	4	1	2026-06-12 17:04:39.309	SHIFT 2	2026-06-13 03:30:07.284	500000.00	1601500.00	1601500.00	0.00	0.00	Shift closed	CLOSED	Kasir 2	Kasir 2	APPROVED	f	0	90	[{"type":"BILLIARD","id":1},{"type":"BILLIARD","id":2},{"type":"BILLIARD","id":3},{"type":"BILLIARD","id":4},{"type":"BILLIARD","id":5},{"type":"BILLIARD","id":6},{"type":"BILLIARD","id":7},{"type":"BILLIARD","id":8},{"type":"BILLIARD","id":9},{"type":"BILLIARD","id":10},{"type":"BILLIARD","id":11},{"type":"BILLIARD","id":12},{"type":"CAFE","id":1},{"type":"CAFE","id":2},{"type":"CAFE","id":3},{"type":"CAFE","id":4},{"type":"CAFE","id":5},{"type":"CAFE","id":6},{"type":"CAFE","id":7},{"type":"CAFE","id":8},{"type":"CAFE","id":9},{"type":"CAFE","id":10},{"type":"CAFE","id":11},{"type":"CAFE","id":12}]	1101500.00	250500.00	0.00		{"totalTransactions":25,"topWaiters":[{"name":"Kasir 2","count":22},{"name":"Teknisi","count":3}],"topPackages":[{"name":"1 JAM WEEKEND","count":16},{"name":"OPEN TABLE WEEKEND","count":14},{"name":"3 JAM WEEKEND","count":4},{"name":"Custom Session","count":1}],"topPromos":[],"topItems":[],"billiardRevenue":1351916.67,"cafeRevenue":0,"topupRevenue":0}	\N	2026-06-12 17:04:39.310438
\.


--
-- Data for Name: stock_ins; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.stock_ins (id, "ingredientId", "supplierId", quantity, unit, "purchasePrice", "totalCost", "receivedByUserId", notes, "paymentStatus", "dueDate", "paidAmount", "invoiceNumber", "createdAt") FROM stdin;
\.


--
-- Data for Name: stock_installment_plans; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.stock_installment_plans (id, "stockInId", "dueDate", amount, "isPaid", "paidAt", "createdAt") FROM stdin;
\.


--
-- Data for Name: stock_payments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.stock_payments (id, "stockInId", amount, "paymentMethod", "userId", notes, "paidAt") FROM stdin;
\.


--
-- Data for Name: suppliers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.suppliers (id, name, "contactPerson", phone, email, address, category, description, "isActive", rating, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: tables; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.tables (id, "tableName", "stationType", "categoryId", "macAddress", "ipAddress", "floorNumber", "productionZone", "espnowGatewayMac", "hardwareType", status, rssi, uptime, "lastHeartbeat", "isLightOn", "relayPin", "sessionType", "startTime", "endTime", "remainingMinutes", "packageId", "activePackagePrice", "lastSessionData", "isBooked", "bookedByWaitingId", "bookedByName", "memberId", "createdAt", "updatedAt", "deletedAt") FROM stdin;
8	MEJA 8	BILLIARD	3	DCDA0C11F150	192.168.0.102	1			PCF8575	available	-56	171967	2026-06-13 04:33:42.255	f	7	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-06-12 03:11:29.069299	2026-06-13 04:33:42.267599	\N
1	MEJA 1	BILLIARD	3	DCDA0C11F150	192.168.0.102	1			PCF8575	available	-56	171967	2026-06-13 04:33:42.268	f	0	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-06-12 03:09:35.117982	2026-06-13 04:33:42.269929	\N
12	MEJA 12	BILLIARD	1	DCDA0C11F150	192.168.0.102	1			PCF8575	available	-56	171967	2026-06-13 04:33:42.27	f	11	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-06-12 03:12:13.152424	2026-06-13 04:33:42.27167	\N
6	MEJA 6	BILLIARD	3	DCDA0C11F150	192.168.0.102	1			PCF8575	available	-56	171967	2026-06-13 04:33:42.285	f	5	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-06-12 03:11:07.055411	2026-06-13 04:33:42.28666	\N
10	MEJA 10	BILLIARD	2	DCDA0C11F150	192.168.0.102	1			PCF8575	available	-56	171967	2026-06-13 04:33:42.298	f	9	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-06-12 03:11:51.296755	2026-06-13 04:33:42.300301	\N
11	MEJA 11	BILLIARD	1	DCDA0C11F150	192.168.0.102	1			PCF8575	available	-56	171967	2026-06-13 04:33:42.301	f	10	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-06-12 03:12:03.151085	2026-06-13 04:33:42.302294	\N
4	MEJA 4	BILLIARD	3	DCDA0C11F150	192.168.0.102	1			PCF8575	available	-56	171967	2026-06-13 04:33:42.334	f	3	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-06-12 03:10:47.400111	2026-06-13 04:33:42.335656	\N
9	MEJA 9	BILLIARD	2	DCDA0C11F150	192.168.0.102	1			PCF8575	available	-56	171967	2026-06-13 04:33:42.336	f	8	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-06-12 03:11:39.224941	2026-06-13 04:33:42.337196	\N
2	MEJA 2	BILLIARD	3	DCDA0C11F150	192.168.0.102	1			PCF8575	available	-56	171967	2026-06-13 04:33:42.356	f	1	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-06-12 03:10:20.747631	2026-06-13 04:33:42.357941	\N
5	MEJA 5	BILLIARD	3	DCDA0C11F150	192.168.0.102	1			PCF8575	available	-59	171937	2026-06-13 04:33:11.988	f	4	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-06-12 03:10:56.659122	2026-06-13 04:33:11.990605	\N
3	MEJA 3	BILLIARD	3	DCDA0C11F150	192.168.0.102	1			PCF8575	available	-59	171937	2026-06-13 04:33:11.992	f	2	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-06-12 03:10:31.368676	2026-06-13 04:33:11.993537	\N
7	MEJA 7	BILLIARD	3	DCDA0C11F150	192.168.0.102	1			PCF8575	available	-59	171937	2026-06-13 04:33:12.009	f	6	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-06-12 03:11:18.313029	2026-06-13 04:33:12.010986	\N
\.


--
-- Data for Name: transaction_payments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.transaction_payments (id, "transactionId", "payerName", "itemsSubtotal", "billiardPortion", "discountAmount", "taxAmount", "serviceAmount", "roundingAmount", "totalPaid", "paymentMethod", "itemsSnapshot", "createdAt", "createdByUserId", "shiftId", "businessDayId") FROM stdin;
1	1	gilang	0.00	0.00	0.00	0.00	0.00	0.00	25000.00	CASH	[]	2026-06-12 11:28:11.890232	3	1	1
2	3	JEFRI	0.00	0.00	0.00	0.00	0.00	0.00	40000.00	QRIS	[]	2026-06-12 13:29:37.011578	3	1	1
3	4	NAFI	0.00	0.00	0.00	0.00	0.00	0.00	44000.00	CASH	[]	2026-06-12 13:52:16.917672	3	1	1
4	5	SLIMIN	0.00	0.00	0.00	0.00	0.00	0.00	20000.00	CASH	[]	2026-06-12 13:54:22.765396	3	1	1
5	2	kacong	0.00	0.00	0.00	0.00	0.00	0.00	60000.00	CASH	[]	2026-06-12 14:10:12.937885	3	1	1
6	8	KACONG	0.00	0.00	0.00	0.00	0.00	0.00	20000.00	CASH	[]	2026-06-12 15:20:49.599181	3	1	1
7	6	DIAN	0.00	0.00	0.00	0.00	0.00	0.00	53000.00	CASH	[]	2026-06-12 15:58:23.54708	3	1	1
8	7	FARIS	0.00	0.00	0.00	0.00	0.00	0.00	40000.00	CASH	[]	2026-06-12 16:00:40.38659	3	1	1
9	10	SLIMIN	0.00	0.00	0.00	0.00	0.00	0.00	20000.00	CASH	[]	2026-06-12 17:49:15.78988	4	2	1
10	11	ELIN	0.00	0.00	0.00	0.00	0.00	0.00	70000.00	QRIS	[]	2026-06-12 19:05:34.859853	4	2	1
11	9	FIKRI	0.00	0.00	0.00	0.00	0.00	0.00	105000.00	CASH	[]	2026-06-12 19:38:39.057348	4	2	1
12	15	z	0.00	0.00	0.00	0.00	0.00	0.00	30000.00	CASH	[]	2026-06-12 20:10:21.514286	4	2	1
13	16	faris	0.00	0.00	0.00	0.00	0.00	0.00	30500.00	CASH	[]	2026-06-12 20:12:55.487659	4	2	1
14	14	niko	0.00	0.00	0.00	0.00	0.00	0.00	60000.00	CASH	[]	2026-06-12 21:02:53.09793	4	2	1
15	17	hasan	0.00	0.00	0.00	0.00	0.00	0.00	70000.00	CASH	[]	2026-06-12 21:15:36.375554	4	2	1
16	12	zulva	0.00	0.00	0.00	0.00	0.00	0.00	85000.00	CASH	[]	2026-06-12 21:54:17.329851	4	2	1
17	13	lana	0.00	0.00	0.00	0.00	0.00	0.00	130000.00	QRIS	[]	2026-06-12 21:57:13.478933	4	2	1
18	22	BARIEL	0.00	0.00	0.00	0.00	0.00	0.00	30000.00	QRIS	[]	2026-06-12 22:02:07.601612	4	2	1
19	19	IQBAL	0.00	0.00	0.00	0.00	0.00	0.00	90000.00	CASH	[]	2026-06-12 22:46:12.575696	4	2	1
20	24	PONOROGO	0.00	0.00	0.00	0.00	0.00	0.00	30000.00	CASH	[]	2026-06-12 22:56:44.677305	4	2	1
21	20	EVAN	0.00	0.00	0.00	0.00	0.00	0.00	85000.00	CASH	[]	2026-06-12 23:20:49.887909	4	2	1
22	21	PUTRA	0.00	0.00	0.00	0.00	0.00	0.00	90000.00	QRIS	[]	2026-06-12 23:22:50.855209	4	2	1
23	23	ALEX	0.00	0.00	0.00	0.00	0.00	0.00	60000.00	CASH	[]	2026-06-12 23:27:22.85217	4	2	1
24	25	gandi	0.00	0.00	0.00	0.00	0.00	0.00	85000.00	CASH	[]	2026-06-12 23:46:25.15087	4	2	1
25	29	fiki	0.00	0.00	0.00	0.00	0.00	0.00	30000.00	CASH	[]	2026-06-13 00:18:31.792277	4	2	1
26	30	EKO	0.00	0.00	0.00	0.00	0.00	0.00	30000.00	CASH	[]	2026-06-13 00:26:06.379017	4	2	1
27	31	RIAN	0.00	0.00	0.00	0.00	0.00	0.00	30000.00	CASH	[]	2026-06-13 00:31:30.767578	4	2	1
28	27	RIAN	0.00	0.00	0.00	0.00	0.00	0.00	60000.00	CASH	[]	2026-06-13 00:49:09.211886	4	2	1
29	35	Tirta	0.00	0.00	0.00	0.00	0.00	0.00	500.00	QRIS	[]	2026-06-13 01:07:18.00549	1	2	1
30	28	RIFKY	0.00	0.00	0.00	0.00	0.00	0.00	64000.00	CASH	[]	2026-06-13 01:18:50.906415	4	2	1
31	32	.	0.00	0.00	0.00	0.00	0.00	0.00	30000.00	CASH	[]	2026-06-13 01:49:09.15486	4	2	1
32	33	OKI	0.00	0.00	0.00	0.00	0.00	0.00	36000.00	CASH	[]	2026-06-13 02:13:11.22265	4	2	1
33	36	JOKOWI	0.00	0.00	0.00	0.00	0.00	0.00	52500.00	CASH	[]	2026-06-13 03:08:29.292526	4	2	1
34	26	AGUNG	0.00	0.00	0.00	0.00	0.00	0.00	143500.00	CASH	[]	2026-06-13 03:22:51.190173	4	2	1
35	18	Gh	0.00	0.00	0.00	0.00	0.00	0.00	0.00	CASH	[]	2026-06-13 03:40:58.200481	1	\N	1
36	34	Tirta	0.00	0.00	0.00	0.00	0.00	0.00	0.00	CASH	[]	2026-06-13 03:41:06.342074	1	\N	1
\.


--
-- Data for Name: transaction_payments_archive; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.transaction_payments_archive (id, "transactionId", "payerName", "itemsSubtotal", "billiardPortion", "discountAmount", "taxAmount", "serviceAmount", "roundingAmount", "totalPaid", "paymentMethod", "itemsSnapshot", "createdAt", "createdByUserId", "shiftId", "businessDayId") FROM stdin;
\.


--
-- Data for Name: transactions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.transactions (id, "invoiceNumber", "customerName", "customerPhone", "generatedBounceBackCode", "tableId", "cafeTableId", "memberId", status, type, "sessionType", "fareName", "startTime", "endTime", "sessionDuration", "billiardTotal", "cafeTotal", "grandTotal", "discountAmount", "vatAmount", "serviceChargeAmount", "roundingAmount", "paidAmount", "paymentDetails", "billingDetails", remarks, "appliedPromos", "createdByUserId", "openedByUserId", "commissionUserId", "paidByUserId", "shiftId", "businessDayId", "packageId", "awardedPoints", "awardedSpend", "payrollReleaseId", "voucherCode", "voucherId", "voucherDiscountAmount", "cashbackEarned", "createdAt", "updatedAt") FROM stdin;
2	TAB-260612110548	kacong	\N	\N	6	\N	\N	PAID	BILLIARD	prepaid	1 JAM WEEKDAYS	2026-06-12 11:05:48.617	2026-06-12 14:05:48.617	\N	60000.00	0.00	60000.00	0.00	0.00	0.00	0.00	60000.00	[{"method":"CASH","amount":60000,"payer":"kacong","timestamp":"2026-06-12T07:10:12.937Z","paymentId":5}]	[{"title":"1 JAM WEEKDAYS","duration":0,"subtotal":20000,"isExtension":false,"ratePerHour":0,"logTime":"2026-06-12T04:06:03.913Z"},{"title":"Extend 1 JAM WEEKDAYS","duration":60,"subtotal":20000,"startTimeFormatted":"12.05","endTimeFormatted":"13.05","logTime":"2026-06-12T04:06:03.913Z"},{"title":"Extend 1 JAM WEEKDAYS","duration":60,"subtotal":20000,"startTimeFormatted":"13.05","endTimeFormatted":"14.05","logTime":"2026-06-12T04:27:03.641Z"}]	\N	[]	3	3	3	\N	1	1	6	0	0.00	\N	\N	\N	0.00	0.00	2026-06-12 11:05:48.672865	2026-06-12 14:10:12.937885
5	TAB-260612125158	SLIMIN	\N	\N	2	\N	\N	PAID	BILLIARD	prepaid	1 JAM WEEKDAYS	2026-06-12 12:51:58.948	2026-06-12 13:51:58.948	\N	20000.00	0.00	20000.00	0.00	0.00	0.00	0.00	20000.00	[{"method":"CASH","amount":20000,"payer":"SLIMIN","timestamp":"2026-06-12T06:54:22.765Z","paymentId":4}]	[{"title":"1 JAM WEEKDAYS","duration":60,"subtotal":20000,"isExtension":false,"ratePerHour":20000,"startTimeFormatted":"12.51","endTimeFormatted":"13.51"}]	\N	[]	3	3	3	\N	1	1	6	0	0.00	\N	\N	\N	0.00	0.00	2026-06-12 12:51:59.01993	2026-06-12 13:54:22.765396
7	TAB-260612135846	FARIS	\N	\N	5	\N	\N	PAID	BILLIARD	prepaid	1 JAM WEEKDAYS	2026-06-12 13:58:46.15	2026-06-12 15:58:46.15	\N	40000.00	0.00	40000.00	0.00	0.00	0.00	0.00	40000.00	[{"method":"CASH","amount":40000,"payer":"FARIS","timestamp":"2026-06-12T09:00:40.386Z","paymentId":8}]	[{"title":"1 JAM WEEKDAYS","duration":0,"subtotal":20000,"isExtension":false,"ratePerHour":0,"logTime":"2026-06-12T06:59:41.357Z"},{"title":"Extend 1 JAM WEEKDAYS","duration":60,"subtotal":20000,"startTimeFormatted":"14.58","endTimeFormatted":"15.58","logTime":"2026-06-12T06:59:41.357Z"}]	\N	[]	3	3	3	\N	1	1	6	0	0.00	\N	\N	\N	0.00	0.00	2026-06-12 13:58:46.195709	2026-06-12 16:00:40.38659
12	TAB-260612185332	zulva	\N	\N	3	\N	\N	PAID	BILLIARD	prepaid	3 JAM WEEKEND	2026-06-12 18:53:32.204	2026-06-12 21:53:32.204	\N	85000.00	0.00	85000.00	0.00	0.00	0.00	0.00	85000.00	[{"method":"CASH","amount":85000,"payer":"zulva","timestamp":"2026-06-12T14:54:17.329Z","paymentId":16}]	[{"title":"3 JAM WEEKEND","duration":180,"subtotal":85000,"isExtension":false,"ratePerHour":85000,"startTimeFormatted":"18.53","endTimeFormatted":"21.53"}]	\N	[]	4	4	4	\N	2	1	13	0	0.00	\N	\N	\N	0.00	0.00	2026-06-12 18:53:32.249661	2026-06-12 21:54:17.329851
3	TAB-260612112648	JEFRI	\N	\N	5	\N	\N	PAID	BILLIARD	prepaid	1 JAM WEEKDAYS	2026-06-12 11:26:48.878	2026-06-12 13:26:48.878	\N	40000.00	0.00	40000.00	0.00	0.00	0.00	0.00	40000.00	[{"method":"QRIS","amount":40000,"payer":"JEFRI","timestamp":"2026-06-12T06:29:37.011Z","paymentId":2}]	[{"title":"1 JAM WEEKDAYS","duration":0,"subtotal":20000,"isExtension":false,"ratePerHour":0,"logTime":"2026-06-12T04:30:26.734Z"},{"title":"Extend 1 JAM WEEKDAYS","duration":60,"subtotal":20000,"startTimeFormatted":"12.26","endTimeFormatted":"13.26","logTime":"2026-06-12T04:30:26.734Z"}]	\N	[]	3	3	3	\N	1	1	6	0	0.00	\N	\N	\N	0.00	0.00	2026-06-12 11:26:48.932247	2026-06-12 13:29:37.011578
1	TAB-260612101257	gilang	\N	\N	1	\N	\N	PAID	BILLIARD	open	OPEN TABLE WEEKDAYS	2026-06-12 10:12:57.425	2026-06-12 11:27:24.068	\N	25000.00	0.00	25000.00	0.00	0.00	0.00	0.00	25000.00	[{"method":"CASH","amount":25000,"payer":"gilang","timestamp":"2026-06-12T04:28:11.890Z","paymentId":1}]	[{"title":"10:00-18:00","date":"12/06/2026","startTimeFormatted":"10.12","duration":75,"cost":24999.99999999998,"isExtension":false,"ratePerHour":20000,"subtotal":25000,"endTimeFormatted":"11.27"}]	\N	[]	3	3	3	\N	1	1	5	0	0.00	\N	\N	\N	0.00	0.00	2026-06-12 10:12:57.489226	2026-06-12 11:28:11.890232
6	TAB-260612125653	DIAN	\N	\N	1	\N	\N	PAID	BILLIARD	prepaid	3 JAM WEEKDAYS	2026-06-12 12:56:53.322	2026-06-12 15:56:53.322	\N	53000.00	0.00	53000.00	0.00	0.00	0.00	0.00	53000.00	[{"method":"CASH","amount":53000,"payer":"DIAN","timestamp":"2026-06-12T08:58:23.547Z","paymentId":7}]	[{"title":"3 JAM WEEKDAYS","duration":180,"subtotal":53000,"isExtension":false,"ratePerHour":53000,"startTimeFormatted":"12.56","endTimeFormatted":"15.56"}]	\N	[]	3	3	3	\N	1	1	8	0	0.00	\N	\N	\N	0.00	0.00	2026-06-12 12:56:53.39183	2026-06-12 15:58:23.54708
13	TAB-260612185642	lana	\N	\N	12	\N	\N	PAID	BILLIARD	prepaid	3 JAM WEEKEND	2026-06-12 18:56:42.905	2026-06-12 21:56:42.905	\N	130000.00	0.00	130000.00	0.00	0.00	0.00	0.00	130000.00	[{"method":"QRIS","amount":130000,"payer":"lana","timestamp":"2026-06-12T14:57:13.478Z","paymentId":17}]	[{"title":"3 JAM WEEKEND","duration":180,"subtotal":130000,"isExtension":false,"ratePerHour":130000,"startTimeFormatted":"18.56","endTimeFormatted":"21.56"}]	\N	[]	4	4	4	\N	2	1	19	0	0.00	\N	\N	\N	0.00	0.00	2026-06-12 18:56:42.978662	2026-06-12 21:57:13.478933
8	TAB-260612141102	KACONG	\N	\N	6	\N	\N	PAID	BILLIARD	prepaid	1 JAM WEEKDAYS	2026-06-12 14:11:02.657	2026-06-12 15:11:02.657	\N	20000.00	0.00	20000.00	0.00	0.00	0.00	0.00	20000.00	[{"method":"CASH","amount":20000,"payer":"KACONG","timestamp":"2026-06-12T08:20:49.599Z","paymentId":6}]	[{"title":"1 JAM WEEKDAYS","duration":60,"subtotal":20000,"isExtension":false,"ratePerHour":20000,"startTimeFormatted":"14.11","endTimeFormatted":"15.11"}]	\N	[]	3	3	3	\N	1	1	6	0	0.00	\N	\N	\N	0.00	0.00	2026-06-12 14:11:02.701892	2026-06-12 15:20:49.599181
4	TAB-260612113911	NAFI	\N	\N	7	\N	\N	PAID	BILLIARD	open	OPEN TABLE WEEKDAYS	2026-06-12 11:39:11.52	2026-06-12 13:50:38.743	\N	44000.00	0.00	44000.00	0.00	0.00	0.00	0.00	44000.00	[{"method":"CASH","amount":44000,"payer":"NAFI","timestamp":"2026-06-12T06:52:16.917Z","paymentId":3}]	[{"title":"10:00-18:00","date":"12/06/2026","startTimeFormatted":"11.39","duration":132,"cost":44000.00000000004,"isExtension":false,"ratePerHour":20000,"subtotal":44000,"endTimeFormatted":"13.51"}]	\N	[]	3	3	3	\N	1	1	5	0	0.00	\N	\N	\N	0.00	0.00	2026-06-12 11:39:11.572117	2026-06-12 13:52:16.917672
10	TAB-260612164435	SLIMIN	\N	\N	1	\N	\N	PAID	BILLIARD	prepaid	1 JAM WEEKEND	2026-06-12 16:44:35.7	2026-06-12 17:44:35.7	\N	20000.00	0.00	20000.00	0.00	0.00	0.00	0.00	20000.00	[{"method":"CASH","amount":20000,"payer":"SLIMIN","timestamp":"2026-06-12T10:49:15.789Z","paymentId":9}]	[{"title":"1 JAM WEEKEND","duration":60,"subtotal":20000,"isExtension":false,"ratePerHour":20000,"startTimeFormatted":"16.44","endTimeFormatted":"17.44"}]	\N	[]	3	3	3	\N	1	1	12	0	0.00	\N	\N	\N	0.00	0.00	2026-06-12 16:44:35.749568	2026-06-12 17:49:15.78988
11	TAB-260612170026	ELIN	\N	\N	10	\N	\N	PAID	BILLIARD	prepaid	1 JAM WEEKEND	2026-06-12 17:00:26.293	2026-06-12 19:00:26.293	\N	70000.00	0.00	70000.00	0.00	0.00	0.00	0.00	70000.00	[{"method":"QRIS","amount":70000,"payer":"ELIN","timestamp":"2026-06-12T12:05:34.859Z","paymentId":10}]	[{"title":"1 JAM WEEKEND","duration":0,"subtotal":35000,"isExtension":false,"ratePerHour":0,"logTime":"2026-06-12T10:00:44.018Z"},{"title":"Extend 1 JAM WEEKEND","duration":60,"subtotal":35000,"startTimeFormatted":"18.00","endTimeFormatted":"19.00","logTime":"2026-06-12T10:00:44.018Z"}]	\N	[]	3	3	3	\N	1	1	15	0	0.00	\N	\N	\N	0.00	0.00	2026-06-12 17:00:26.361947	2026-06-12 19:05:34.859853
14	TAB-260612190225	niko	\N	\N	4	\N	\N	PAID	BILLIARD	open	OPEN TABLE WEEKEND	2026-06-12 19:02:25.502	2026-06-12 21:02:25.335	\N	60000.00	0.00	60000.00	0.00	0.00	0.00	0.00	60000.00	[{"method":"CASH","amount":60000,"payer":"niko","timestamp":"2026-06-12T14:02:53.097Z","paymentId":14}]	[{"title":"17:00-02:00","date":"12/06/2026","startTimeFormatted":"19.02","duration":120,"cost":60000.00000000001,"isExtension":false,"ratePerHour":30000,"subtotal":60000,"endTimeFormatted":"21.02"}]	\N	[]	4	4	4	\N	2	1	11	0	0.00	\N	\N	\N	0.00	0.00	2026-06-12 19:02:25.553138	2026-06-12 21:02:53.09793
19	TAB-260612194030	IQBAL	\N	\N	2	\N	\N	PAID	BILLIARD	prepaid	1 JAM WEEKEND	2026-06-12 19:40:30.86	2026-06-12 22:42:04.958	\N	90000.00	0.00	90000.00	0.00	0.00	0.00	0.00	90000.00	[{"method":"CASH","amount":90000,"payer":"IQBAL","timestamp":"2026-06-12T15:46:12.575Z","paymentId":19}]	[{"title":"1 JAM WEEKEND","duration":0,"subtotal":30000,"isExtension":false,"ratePerHour":0,"logTime":"2026-06-12T12:40:34.848Z"},{"title":"Extend 1 JAM WEEKEND","duration":60,"subtotal":30000,"startTimeFormatted":"20.40","endTimeFormatted":"21.40","logTime":"2026-06-12T12:40:34.848Z"},{"title":"Extend 1 JAM WEEKEND","duration":60,"subtotal":30000,"startTimeFormatted":"21.42","endTimeFormatted":"22.42","logTime":"2026-06-12T14:42:05.026Z"}]	\N	[]	4	4	4	\N	2	1	12	0	0.00	\N	\N	\N	0.00	0.00	2026-06-12 19:40:30.905265	2026-06-12 22:46:12.575696
9	TAB-260612153321	FIKRI	\N	\N	9	\N	\N	PAID	BILLIARD	prepaid	3 JAM WEEKEND	2026-06-12 15:33:21.472	2026-06-12 19:34:04.375	\N	105000.00	0.00	105000.00	0.00	0.00	0.00	0.00	105000.00	[{"method":"CASH","amount":105000,"payer":"FIKRI","timestamp":"2026-06-12T12:38:39.057Z","paymentId":11}]	[{"title":"3 JAM WEEKEND","duration":180,"subtotal":70000,"isExtension":false,"ratePerHour":70000,"startTimeFormatted":"15.33","endTimeFormatted":"18.33"},{"title":"Extend 1 JAM WEEKEND","duration":60,"subtotal":35000,"startTimeFormatted":"18.34","endTimeFormatted":"19.34","logTime":"2026-06-12T11:34:04.452Z"}]	\N	[]	3	3	3	\N	1	1	16	0	0.00	\N	\N	\N	0.00	0.00	2026-06-12 15:33:21.552999	2026-06-12 19:38:39.057348
17	TAB-260612191149	hasan	\N	\N	10	\N	\N	PAID	BILLIARD	prepaid	1 JAM WEEKEND	2026-06-12 19:11:49.046	2026-06-12 21:11:49.046	\N	70000.00	0.00	70000.00	0.00	0.00	0.00	0.00	70000.00	[{"method":"CASH","amount":70000,"payer":"hasan","timestamp":"2026-06-12T14:15:36.375Z","paymentId":15}]	[{"title":"1 JAM WEEKEND","duration":0,"subtotal":35000,"isExtension":false,"ratePerHour":0,"logTime":"2026-06-12T12:11:54.496Z"},{"title":"Extend 1 JAM WEEKEND","duration":60,"subtotal":35000,"startTimeFormatted":"20.11","endTimeFormatted":"21.11","logTime":"2026-06-12T12:11:54.496Z"}]	\N	[]	4	4	4	\N	2	1	15	0	0.00	\N	\N	\N	0.00	0.00	2026-06-12 19:11:49.088672	2026-06-12 21:15:36.375554
24	TAB-260612215622	PONOROGO	\N	\N	1	\N	\N	PAID	BILLIARD	open	OPEN TABLE WEEKEND	2026-06-12 21:56:22.751	2026-06-12 22:56:22.032	\N	30000.00	0.00	30000.00	0.00	0.00	0.00	0.00	30000.00	[{"method":"CASH","amount":30000,"payer":"PONOROGO","timestamp":"2026-06-12T15:56:44.677Z","paymentId":20}]	[{"title":"17:00-02:00","date":"12/06/2026","startTimeFormatted":"21.56","duration":60,"cost":30000.000000000004,"isExtension":false,"ratePerHour":30000,"subtotal":30000,"endTimeFormatted":"22.56"}]	\N	[]	4	4	4	\N	2	1	11	0	0.00	\N	\N	\N	0.00	0.00	2026-06-12 21:56:22.796293	2026-06-12 22:56:44.677305
15	TAB-260612191007	z	\N	\N	1	\N	\N	PAID	BILLIARD	open	OPEN TABLE WEEKEND	2026-06-12 19:10:07.488	2026-06-12 20:10:06.159	\N	30000.00	0.00	30000.00	0.00	0.00	0.00	0.00	30000.00	[{"method":"CASH","amount":30000,"payer":"z","timestamp":"2026-06-12T13:10:21.514Z","paymentId":12}]	[{"title":"17:00-02:00","date":"12/06/2026","startTimeFormatted":"19.10","duration":60,"cost":30000.000000000004,"isExtension":false,"ratePerHour":30000,"subtotal":30000,"endTimeFormatted":"20.10"}]	\N	[]	4	4	4	\N	2	1	11	0	0.00	\N	\N	\N	0.00	0.00	2026-06-12 19:10:07.538842	2026-06-12 20:10:21.514286
16	TAB-260612191129	faris	\N	\N	8	\N	\N	PAID	BILLIARD	open	OPEN TABLE WEEKEND	2026-06-12 19:11:29.228	2026-06-12 20:11:30.728	\N	30500.00	0.00	30500.00	0.00	0.00	0.00	0.00	30500.00	[{"method":"CASH","amount":30500,"payer":"faris","timestamp":"2026-06-12T13:12:55.487Z","paymentId":13}]	[{"title":"17:00-02:00","date":"12/06/2026","startTimeFormatted":"19.11","duration":61,"cost":30500.000000000004,"isExtension":false,"ratePerHour":30000,"subtotal":30500,"endTimeFormatted":"20.12"}]	\N	[]	4	4	4	\N	2	1	11	0	0.00	\N	\N	\N	0.00	0.00	2026-06-12 19:11:29.27199	2026-06-12 20:12:55.487659
25	TAB-260612222318	gandi	\N	\N	7	\N	\N	PAID	BILLIARD	prepaid	3 JAM WEEKEND	2026-06-12 22:23:18.954	2026-06-13 01:23:18.954	\N	85000.00	0.00	85000.00	0.00	0.00	0.00	0.00	85000.00	[{"method":"CASH","amount":85000,"payer":"gandi","timestamp":"2026-06-12T16:46:25.150Z","paymentId":24}]	[{"title":"3 JAM WEEKEND","duration":180,"subtotal":85000,"isExtension":false,"ratePerHour":85000,"startTimeFormatted":"22.23","endTimeFormatted":"23.46"}]	\N	[]	4	4	4	\N	2	1	13	0	0.00	\N	\N	\N	0.00	0.00	2026-06-12 22:23:18.99882	2026-06-12 23:46:25.15087
23	TAB-260612212344	ALEX	\N	\N	5	\N	\N	PAID	BILLIARD	prepaid	1 JAM WEEKEND	2026-06-12 21:23:44.328	2026-06-12 23:23:44.328	\N	60000.00	0.00	60000.00	0.00	0.00	0.00	0.00	60000.00	[{"method":"CASH","amount":60000,"payer":"ALEX","timestamp":"2026-06-12T16:27:22.852Z","paymentId":23}]	[{"title":"1 JAM WEEKEND","duration":0,"subtotal":30000,"isExtension":false,"ratePerHour":0,"logTime":"2026-06-12T14:23:49.566Z"},{"title":"Extend 1 JAM WEEKEND","duration":60,"subtotal":30000,"startTimeFormatted":"22.23","endTimeFormatted":"23.23","logTime":"2026-06-12T14:23:49.566Z"}]	\N	[]	4	4	4	\N	2	1	12	0	0.00	\N	\N	\N	0.00	0.00	2026-06-12 21:23:44.403881	2026-06-12 23:27:22.85217
18	CAFE-20260612-0001-815	Gh	\N	\N	\N	1	\N	PAID	CAFE	cafe-only	\N	2026-06-12 19:38:14.532	\N	\N	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	[{"method":"CASH","amount":0,"payer":"Gh","timestamp":"2026-06-12T20:40:58.200Z","paymentId":35}]	[]	\N	[]	1	1	\N	\N	2	1	\N	0	0.00	\N	\N	\N	0.00	0.00	2026-06-12 19:38:14.474842	2026-06-13 03:40:58.200481
29	TAB-260612231637	fiki	\N	\N	2	\N	\N	PAID	BILLIARD	prepaid	1 JAM WEEKEND	2026-06-12 23:16:37.629	2026-06-13 00:16:37.629	\N	30000.00	0.00	30000.00	0.00	0.00	0.00	0.00	30000.00	[{"method":"CASH","amount":30000,"payer":"fiki","timestamp":"2026-06-12T17:18:31.792Z","paymentId":25}]	[{"title":"1 JAM WEEKEND","duration":60,"subtotal":30000,"isExtension":false,"ratePerHour":30000,"startTimeFormatted":"23.16","endTimeFormatted":"24.16"}]	\N	[]	4	4	4	\N	2	1	12	0	0.00	\N	\N	\N	0.00	0.00	2026-06-12 23:16:37.6726	2026-06-13 00:18:31.792277
22	TAB-260612205838	BARIEL	\N	\N	7	\N	\N	PAID	BILLIARD	prepaid	1 JAM WEEKEND	2026-06-12 20:58:38.085	2026-06-12 21:58:38.085	\N	30000.00	0.00	30000.00	0.00	0.00	0.00	0.00	30000.00	[{"method":"QRIS","amount":30000,"payer":"BARIEL","timestamp":"2026-06-12T15:02:07.601Z","paymentId":18}]	[{"title":"1 JAM WEEKEND","duration":60,"subtotal":30000,"isExtension":false,"ratePerHour":30000,"startTimeFormatted":"20.58","endTimeFormatted":"21.58"}]	\N	[]	4	4	4	\N	2	1	12	0	0.00	\N	\N	\N	0.00	0.00	2026-06-12 20:58:38.164357	2026-06-12 22:02:07.601612
20	TAB-260612201747	EVAN	\N	\N	6	\N	\N	PAID	BILLIARD	prepaid	3 JAM WEEKEND	2026-06-12 20:17:47.648	2026-06-12 23:17:47.648	\N	85000.00	0.00	85000.00	0.00	0.00	0.00	0.00	85000.00	[{"method":"CASH","amount":85000,"payer":"EVAN","timestamp":"2026-06-12T16:20:49.887Z","paymentId":21}]	[{"title":"3 JAM WEEKEND","duration":180,"subtotal":85000,"isExtension":false,"ratePerHour":85000,"startTimeFormatted":"20.17","endTimeFormatted":"23.17"}]	\N	[]	4	4	4	\N	2	1	13	0	0.00	\N	\N	\N	0.00	0.00	2026-06-12 20:17:47.691351	2026-06-12 23:20:49.887909
21	TAB-260612202156	PUTRA	\N	\N	8	\N	\N	PAID	BILLIARD	prepaid	1 JAM WEEKEND	2026-06-12 20:21:56.093	2026-06-12 23:22:24.52	\N	90000.00	0.00	90000.00	0.00	0.00	0.00	0.00	90000.00	[{"method":"QRIS","amount":90000,"payer":"PUTRA","timestamp":"2026-06-12T16:22:50.855Z","paymentId":22}]	[{"title":"1 JAM WEEKEND","duration":0,"subtotal":30000,"isExtension":false,"ratePerHour":0,"logTime":"2026-06-12T13:22:00.422Z"},{"title":"Extend 1 JAM WEEKEND","duration":60,"subtotal":30000,"startTimeFormatted":"21.21","endTimeFormatted":"22.21","logTime":"2026-06-12T13:22:00.422Z"},{"title":"Extend 1 JAM WEEKEND","duration":60,"subtotal":30000,"startTimeFormatted":"22.22","endTimeFormatted":"23.22","logTime":"2026-06-12T15:22:24.583Z"}]	\N	[]	4	4	4	\N	2	1	12	0	0.00	\N	\N	\N	0.00	0.00	2026-06-12 20:21:56.138032	2026-06-12 23:22:50.855209
36	TAB-260612012405	JOKOWI	\N	\N	1	\N	\N	PAID	BILLIARD	open	OPEN TABLE WEEKEND	2026-06-13 01:24:05.888	2026-06-13 03:08:17.552	\N	52500.00	0.00	52500.00	0.00	0.00	0.00	0.00	52500.00	[{"method":"CASH","amount":52500,"payer":"JOKOWI","timestamp":"2026-06-12T20:08:29.292Z","paymentId":33}]	[{"title":"17:00-02:00","date":"13/06/2026","startTimeFormatted":"01.24","duration":36,"cost":18000.000000000004,"isExtension":false,"ratePerHour":30000,"subtotal":18000,"endTimeFormatted":"02.00"},{"title":"02:00-10:00","date":"13/06/2026","startTimeFormatted":"02.00","duration":69,"cost":34500.00000000001,"isExtension":false,"ratePerHour":30000,"subtotal":34500,"endTimeFormatted":"03.09"}]	\N	[]	4	4	4	\N	2	1	11	0	0.00	\N	\N	\N	0.00	0.00	2026-06-13 01:24:05.930009	2026-06-13 03:08:29.292526
26	TAB-260612223633	AGUNG	\N	\N	3	\N	\N	PAID	BILLIARD	open	OPEN TABLE WEEKEND	2026-06-12 22:36:33.828	2026-06-13 03:22:44.137	\N	143500.00	0.00	143500.00	0.00	0.00	0.00	0.00	143500.00	[{"method":"CASH","amount":143500,"payer":"AGUNG","timestamp":"2026-06-12T20:22:51.190Z","paymentId":34}]	[{"title":"17:00-02:00","date":"12/06/2026","startTimeFormatted":"22.36","duration":84,"cost":42000.00000000001,"isExtension":false,"ratePerHour":30000,"subtotal":42000,"endTimeFormatted":"00.00"},{"title":"17:00-02:00","date":"13/06/2026","startTimeFormatted":"00.00","duration":120,"cost":60000.00000000001,"isExtension":false,"ratePerHour":30000,"subtotal":60000,"endTimeFormatted":"02.00"},{"title":"02:00-10:00","date":"13/06/2026","startTimeFormatted":"02.00","duration":83,"cost":41500.00000000001,"isExtension":false,"ratePerHour":30000,"subtotal":41500,"endTimeFormatted":"03.23"}]	\N	[]	4	4	4	\N	2	1	11	0	0.00	\N	\N	\N	0.00	0.00	2026-06-12 22:36:33.868678	2026-06-13 03:22:51.190173
35	TAB-260612010656	Tirta	\N	\N	2	\N	\N	PAID	BILLIARD	prepaid	Custom Session	2026-06-13 01:06:56.229	2026-06-13 01:07:56.229	\N	416.67	0.00	500.00	0.00	0.00	0.00	83.33	500.00	[{"method":"QRIS","amount":500,"payer":"Tirta","timestamp":"2026-06-12T18:07:18.005Z","paymentId":29}]	[{"title":"Custom Session","duration":0,"subtotal":416.67,"isExtension":false,"ratePerHour":0,"startTimeFormatted":"01.06","endTimeFormatted":"01.07"}]	\N	[]	1	1	4	\N	2	1	\N	0	0.00	\N	\N	\N	0.00	0.00	2026-06-13 01:06:56.268099	2026-06-13 01:07:18.00549
28	TAB-260612231108	RIFKY	\N	\N	1	\N	\N	PAID	BILLIARD	open	OPEN TABLE WEEKEND	2026-06-12 23:11:08.199	2026-06-13 01:18:37.921	\N	64000.00	0.00	64000.00	0.00	0.00	0.00	0.00	64000.00	[{"method":"CASH","amount":64000,"payer":"RIFKY","timestamp":"2026-06-12T18:18:50.906Z","paymentId":30}]	[{"title":"17:00-02:00","date":"12/06/2026","startTimeFormatted":"23.11","duration":49,"cost":24500.000000000004,"isExtension":false,"ratePerHour":30000,"subtotal":24500,"endTimeFormatted":"00.00"},{"title":"17:00-02:00","date":"13/06/2026","startTimeFormatted":"00.00","duration":79,"cost":39500.00000000001,"isExtension":false,"ratePerHour":30000,"subtotal":39500,"endTimeFormatted":"01.19"}]	\N	[]	4	4	4	\N	2	1	11	0	0.00	\N	\N	\N	0.00	0.00	2026-06-12 23:11:08.248658	2026-06-13 01:18:50.906415
33	TAB-260612005920	OKI	\N	\N	5	\N	\N	PAID	BILLIARD	open	OPEN TABLE WEEKEND	2026-06-13 00:59:20.564	2026-06-13 02:11:20.197	\N	36000.00	0.00	36000.00	0.00	0.00	0.00	0.00	36000.00	[{"method":"CASH","amount":36000,"payer":"OKI","timestamp":"2026-06-12T19:13:11.222Z","paymentId":32}]	[{"title":"17:00-02:00","date":"13/06/2026","startTimeFormatted":"00.59","duration":61,"cost":30500.000000000004,"isExtension":false,"ratePerHour":30000,"subtotal":30500,"endTimeFormatted":"02.00"},{"title":"02:00-10:00","date":"13/06/2026","startTimeFormatted":"02.00","duration":11,"cost":5500.000000000001,"isExtension":false,"ratePerHour":30000,"subtotal":5500,"endTimeFormatted":"02.11"}]	\N	[]	4	4	4	\N	2	1	11	0	0.00	\N	\N	\N	0.00	0.00	2026-06-13 00:59:20.611694	2026-06-13 02:13:11.22265
30	TAB-260612232535	EKO	\N	\N	6	\N	\N	PAID	BILLIARD	prepaid	1 JAM WEEKEND	2026-06-12 23:25:35.241	2026-06-13 00:25:35.241	\N	30000.00	0.00	30000.00	0.00	0.00	0.00	0.00	30000.00	[{"method":"CASH","amount":30000,"payer":"EKO","timestamp":"2026-06-12T17:26:06.379Z","paymentId":26}]	[{"title":"1 JAM WEEKEND","duration":60,"subtotal":30000,"isExtension":false,"ratePerHour":30000,"startTimeFormatted":"23.25","endTimeFormatted":"24.25"}]	\N	[]	4	4	4	\N	2	1	12	0	0.00	\N	\N	\N	0.00	0.00	2026-06-12 23:25:35.398463	2026-06-13 00:26:06.379017
34	CAFE-20260613-0002-764	Tirta	\N	\N	\N	2	\N	PAID	CAFE	cafe-only	\N	2026-06-13 01:06:13.599	\N	\N	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	[{"method":"CASH","amount":0,"payer":"Tirta","timestamp":"2026-06-12T20:41:06.342Z","paymentId":36}]	[]	\N	[]	1	1	\N	\N	2	1	\N	0	0.00	\N	\N	\N	0.00	0.00	2026-06-13 01:06:13.553127	2026-06-13 03:41:06.342074
31	TAB-260612233102	RIAN	\N	\N	8	\N	\N	PAID	BILLIARD	prepaid	1 JAM WEEKEND	2026-06-12 23:31:02.063	2026-06-13 00:31:02.063	\N	30000.00	0.00	30000.00	0.00	0.00	0.00	0.00	30000.00	[{"method":"CASH","amount":30000,"payer":"RIAN","timestamp":"2026-06-12T17:31:30.767Z","paymentId":27}]	[{"title":"1 JAM WEEKEND","duration":60,"subtotal":30000,"isExtension":false,"ratePerHour":30000,"startTimeFormatted":"23.31","endTimeFormatted":"24.31"}]	\N	[]	4	4	4	\N	2	1	12	0	0.00	\N	\N	\N	0.00	0.00	2026-06-12 23:31:02.173629	2026-06-13 00:31:30.767578
27	TAB-260612224543	RIAN	\N	\N	4	\N	\N	PAID	BILLIARD	prepaid	1 JAM WEEKEND	2026-06-12 22:45:43.697	2026-06-13 00:45:43.697	\N	60000.00	0.00	60000.00	0.00	0.00	0.00	0.00	60000.00	[{"method":"CASH","amount":60000,"payer":"RIAN","timestamp":"2026-06-12T17:49:09.211Z","paymentId":28}]	[{"title":"1 JAM WEEKEND","duration":0,"subtotal":30000,"isExtension":false,"ratePerHour":0,"logTime":"2026-06-12T15:45:47.485Z"},{"title":"Extend 1 JAM WEEKEND","duration":60,"subtotal":30000,"startTimeFormatted":"23.45","endTimeFormatted":"24.45","logTime":"2026-06-12T15:45:47.485Z"}]	\N	[]	4	4	4	\N	2	1	12	0	0.00	\N	\N	\N	0.00	0.00	2026-06-12 22:45:43.792897	2026-06-13 00:49:09.211886
32	TAB-260612004944	.	\N	\N	4	\N	\N	PAID	BILLIARD	open	OPEN TABLE WEEKEND	2026-06-13 00:49:44.25	2026-06-13 01:49:01.332	\N	30000.00	0.00	30000.00	0.00	0.00	0.00	0.00	30000.00	[{"method":"CASH","amount":30000,"payer":".","timestamp":"2026-06-12T18:49:09.154Z","paymentId":31}]	[{"title":"17:00-02:00","date":"13/06/2026","startTimeFormatted":"00.49","duration":60,"cost":30000.000000000004,"isExtension":false,"ratePerHour":30000,"subtotal":30000,"endTimeFormatted":"01.49"}]	\N	[]	4	4	4	\N	2	1	11	0	0.00	\N	\N	\N	0.00	0.00	2026-06-13 00:49:44.316549	2026-06-13 01:49:09.15486
\.


--
-- Data for Name: transactions_archive; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.transactions_archive (id, "invoiceNumber", "customerName", "customerPhone", "generatedBounceBackCode", "tableId", "cafeTableId", "memberId", status, type, "sessionType", "fareName", "startTime", "endTime", "sessionDuration", "billiardTotal", "cafeTotal", "grandTotal", "discountAmount", "vatAmount", "serviceChargeAmount", "roundingAmount", "paidAmount", "paymentDetails", "billingDetails", remarks, "appliedPromos", "createdByUserId", "openedByUserId", "commissionUserId", "paidByUserId", "shiftId", "businessDayId", "packageId", "awardedPoints", "awardedSpend", "payrollReleaseId", "voucherCode", "voucherId", "voucherDiscountAmount", "cashbackEarned", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: user_status_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_status_logs (id, status, "startedAt", "endedAt", "durationSeconds", "userId") FROM stdin;
1	OFFLINE	2026-06-12 02:32:03.219471	2026-06-12 02:32:04.776	1	1
2	ACTIVE	2026-06-12 02:32:04.776	2026-06-12 02:34:10.972	126	1
3	AWAY	2026-06-12 02:34:10.972	2026-06-12 02:34:11.127	0	1
4	ACTIVE	2026-06-12 02:34:11.127	2026-06-12 02:34:11.868	0	1
56	AWAY	2026-06-12 03:15:39.056	2026-06-12 03:15:39.831	0	1
5	AWAY	2026-06-12 02:34:11.868	2026-06-12 02:34:12.125	0	1
6	ACTIVE	2026-06-12 02:34:12.122	\N	0	1
7	ACTIVE	2026-06-12 02:34:12.125	2026-06-12 02:34:41.121	28	1
59	ACTIVE	2026-06-12 03:15:39.831	\N	0	1
8	AWAY	2026-06-12 02:34:41.121	2026-06-12 02:34:48.27	7	1
9	ACTIVE	2026-06-12 02:34:48.258	\N	0	1
10	ACTIVE	2026-06-12 02:34:48.27	2026-06-12 02:34:55.401	7	1
11	AWAY	2026-06-12 02:34:55.401	2026-06-12 02:34:55.737	0	1
12	ACTIVE	2026-06-12 02:34:55.737	2026-06-12 02:34:57.275	1	1
58	ACTIVE	2026-06-12 03:15:39.643	2026-06-12 03:15:39.971	0	1
13	AWAY	2026-06-12 02:34:57.275	2026-06-12 02:34:57.327	0	1
14	ACTIVE	2026-06-12 02:34:57.32	\N	0	1
15	ACTIVE	2026-06-12 02:34:57.327	2026-06-12 02:35:19.668	22	1
16	AWAY	2026-06-12 02:35:19.668	2026-06-12 02:35:29.284	9	1
17	ACTIVE	2026-06-12 02:35:29.284	2026-06-12 02:35:30.772	1	1
18	AWAY	2026-06-12 02:35:30.772	2026-06-12 02:35:34.23	3	1
19	ACTIVE	2026-06-12 02:35:34.23	2026-06-12 02:35:38.375	4	1
20	AWAY	2026-06-12 02:35:38.375	2026-06-12 02:35:40.671	2	1
22	ACTIVE	2026-06-12 02:35:40.671	2026-06-12 02:37:24.399	103	1
23	AWAY	2026-06-12 02:37:24.399	2026-06-12 02:37:24.855	0	1
24	ACTIVE	2026-06-12 02:37:24.855	2026-06-12 02:37:41.103	16	1
25	AWAY	2026-06-12 02:37:41.103	2026-06-12 02:37:51.979	10	1
26	OFFLINE	2026-06-12 02:37:51.979	2026-06-12 02:37:52.228	0	1
21	ACTIVE	2026-06-12 02:35:40.666	2026-06-12 02:37:52.274	131	1
28	ACTIVE	2026-06-12 02:37:52.274	2026-06-12 02:38:00.425	8	1
27	ACTIVE	2026-06-12 02:37:52.228	2026-06-12 02:38:00.461	8	1
30	OFFLINE	2026-06-12 02:38:00.461	2026-06-12 02:39:06.921	66	1
31	ACTIVE	2026-06-12 02:39:06.921	\N	0	1
29	AWAY	2026-06-12 02:38:00.425	2026-06-12 02:39:07.071	66	1
32	ACTIVE	2026-06-12 02:39:07.071	2026-06-12 02:46:26.401	439	1
33	AWAY	2026-06-12 02:46:26.401	2026-06-12 02:48:41.321	134	1
34	OFFLINE	2026-06-12 02:48:41.321	2026-06-12 02:48:53.756	12	1
60	ACTIVE	2026-06-12 03:15:39.971	2026-06-12 03:17:18.015	98	1
35	ACTIVE	2026-06-12 02:48:53.756	2026-06-12 02:49:22.151	28	1
36	AWAY	2026-06-12 02:49:22.05	\N	0	1
85	OFFLINE	2026-06-12 03:20:29.481258	\N	0	2
38	ACTIVE	2026-06-12 02:49:22.69	\N	0	1
37	OFFLINE	2026-06-12 02:49:22.151	2026-06-12 02:49:23.031	0	1
39	ACTIVE	2026-06-12 02:49:22.871	\N	0	1
40	ACTIVE	2026-06-12 02:49:23.031	2026-06-12 03:04:06.321	883	1
61	AWAY	2026-06-12 03:17:18.015	2026-06-12 03:17:24.356	6	1
41	AWAY	2026-06-12 03:04:06.321	2026-06-12 03:05:23.062	76	1
42	ACTIVE	2026-06-12 03:05:23.04	\N	0	1
43	ACTIVE	2026-06-12 03:05:23.062	2026-06-12 03:05:32.557	9	1
62	ACTIVE	2026-06-12 03:17:24.347	\N	0	1
44	AWAY	2026-06-12 03:05:32.557	2026-06-12 03:07:42.977	130	1
45	ACTIVE	2026-06-12 03:07:42.995	2026-06-12 03:09:55.3	132	1
46	ACTIVE	2026-06-12 03:07:42.977	2026-06-12 03:09:55.368	132	1
48	OFFLINE	2026-06-12 03:09:55.368	2026-06-12 03:09:55.957	0	1
49	ACTIVE	2026-06-12 03:09:55.957	2026-06-12 03:12:37.647	161	1
50	AWAY	2026-06-12 03:12:37.647	\N	0	1
47	AWAY	2026-06-12 03:09:55.3	2026-06-12 03:12:37.707	162	1
51	OFFLINE	2026-06-12 03:12:37.707	2026-06-12 03:12:39.088	1	1
52	ACTIVE	2026-06-12 03:12:39.088	2026-06-12 03:13:11.907	32	1
53	AWAY	2026-06-12 03:13:11.907	2026-06-12 03:15:32.602	140	1
55	ACTIVE	2026-06-12 03:15:32.602	\N	0	1
63	ACTIVE	2026-06-12 03:17:24.356	2026-06-12 03:17:28.042	3	1
54	ACTIVE	2026-06-12 03:15:32.606	2026-06-12 03:15:39.171	6	1
57	OFFLINE	2026-06-12 03:15:39.171	2026-06-12 03:15:39.643	0	1
98	ACTIVE	2026-06-12 03:30:58.084	2026-06-12 03:31:15.219	17	1
64	AWAY	2026-06-12 03:17:28.042	2026-06-12 03:17:31.464	3	1
65	ACTIVE	2026-06-12 03:17:31.391	\N	0	1
66	ACTIVE	2026-06-12 03:17:31.464	2026-06-12 03:17:33.132	1	1
84	AWAY	2026-06-12 03:19:32.931	2026-06-12 03:20:57.096	84	1
67	AWAY	2026-06-12 03:17:33.132	2026-06-12 03:17:34.728	1	1
68	ACTIVE	2026-06-12 03:17:34.7	\N	0	1
86	ACTIVE	2026-06-12 03:20:57.042	\N	0	1
69	ACTIVE	2026-06-12 03:17:34.728	2026-06-12 03:17:45.16	10	1
70	AWAY	2026-06-12 03:17:45.106	\N	0	1
71	OFFLINE	2026-06-12 03:17:45.16	2026-06-12 03:17:45.66	0	1
72	ACTIVE	2026-06-12 03:17:45.66	2026-06-12 03:18:30.554	44	1
73	AWAY	2026-06-12 03:18:30.554	2026-06-12 03:18:31.452	0	1
74	ACTIVE	2026-06-12 03:18:31.452	2026-06-12 03:18:36.44	4	1
75	AWAY	2026-06-12 03:18:36.44	2026-06-12 03:18:39.627	3	1
76	ACTIVE	2026-06-12 03:18:39.602	\N	0	1
77	ACTIVE	2026-06-12 03:18:39.627	2026-06-12 03:18:56.745	17	1
87	ACTIVE	2026-06-12 03:20:57.096	2026-06-12 03:23:30.921	153	1
78	AWAY	2026-06-12 03:18:56.745	2026-06-12 03:19:02.47	5	1
80	ACTIVE	2026-06-12 03:19:02.47	\N	0	1
79	ACTIVE	2026-06-12 03:19:02.502	2026-06-12 03:19:08.006	5	1
82	ACTIVE	2026-06-12 03:19:11.028	\N	0	1
81	AWAY	2026-06-12 03:19:08.006	2026-06-12 03:19:11.068	3	1
83	ACTIVE	2026-06-12 03:19:11.068	2026-06-12 03:19:32.931	21	1
90	ACTIVE	2026-06-12 03:26:28.93	\N	0	1
88	AWAY	2026-06-12 03:23:30.921	2026-06-12 03:26:29.073	178	1
91	ACTIVE	2026-06-12 03:26:29.073	2026-06-12 03:27:35.415	66	1
106	AWAY	2026-06-12 03:32:06.501	2026-06-12 03:32:08.979	2	1
93	AWAY	2026-06-12 03:27:35.415	2026-06-12 03:27:36.699	1	1
94	ACTIVE	2026-06-12 03:27:36.656	\N	0	1
95	ACTIVE	2026-06-12 03:27:36.699	2026-06-12 03:30:39.126	182	1
99	AWAY	2026-06-12 03:31:15.219	2026-06-12 03:31:18.631	3	1
96	AWAY	2026-06-12 03:30:39.126	2026-06-12 03:30:58.084	18	1
97	ACTIVE	2026-06-12 03:30:58.067	\N	0	1
100	ACTIVE	2026-06-12 03:31:18.571	\N	0	1
103	OFFLINE	2026-06-12 03:31:39.707	2026-06-12 03:32:02.033	22	1
101	ACTIVE	2026-06-12 03:31:18.631	2026-06-12 03:31:39.707	21	1
102	AWAY	2026-06-12 03:31:39.637	\N	0	1
104	ACTIVE	2026-06-12 03:32:01.999	\N	0	1
105	ACTIVE	2026-06-12 03:32:02.033	2026-06-12 03:32:06.501	4	1
107	ACTIVE	2026-06-12 03:32:08.979	2026-06-12 03:32:34.429	25	1
108	AWAY	2026-06-12 03:32:34.429	2026-06-12 03:33:46.705	72	1
109	ACTIVE	2026-06-12 03:33:46.705	2026-06-12 03:33:51.694	4	1
110	AWAY	2026-06-12 03:33:51.694	2026-06-12 03:34:41.064	49	1
112	OFFLINE	2026-06-12 03:34:41.064	2026-06-12 03:35:31.432	50	1
113	ACTIVE	2026-06-12 03:35:31.432	2026-06-12 03:36:29.202	57	1
111	OFFLINE	2026-06-12 03:34:35.127551	2026-06-12 03:36:35.702	120	5
117	ACTIVE	2026-06-12 03:37:43.041	2026-06-12 03:39:08.122	85	1
114	AWAY	2026-06-12 03:36:29.202	2026-06-12 03:37:43.041	73	1
116	ACTIVE	2026-06-12 03:37:43.024	\N	0	1
115	ACTIVE	2026-06-12 03:36:35.702	2026-06-12 03:39:09.172	153	5
89	OFFLINE	2026-06-12 03:24:02.244028	2026-06-12 04:45:51.163	4908	3
92	OFFLINE	2026-06-12 03:27:05.28643	2026-06-12 17:04:24.968	49039	4
119	AWAY	2026-06-12 03:39:09.172	\N	0	5
120	OFFLINE	2026-06-12 03:39:09.214	2026-06-12 03:39:09.738	0	5
121	ACTIVE	2026-06-12 03:39:09.738	2026-06-12 03:39:09.836	0	5
122	ACTIVE	2026-06-12 03:39:09.836	2026-06-12 03:39:15.033	5	5
123	AWAY	2026-06-12 03:39:15.033	2026-06-12 03:39:17.563	2	5
177	ACTIVE	2026-06-12 03:46:32.194	2026-06-12 03:46:44.565	12	1
118	AWAY	2026-06-12 03:39:08.122	2026-06-12 03:39:42.697	34	1
125	ACTIVE	2026-06-12 03:39:42.689	\N	0	1
126	ACTIVE	2026-06-12 03:39:42.697	2026-06-12 03:39:44.095	1	1
128	ACTIVE	2026-06-12 03:39:46.752	\N	0	1
127	AWAY	2026-06-12 03:39:44.095	2026-06-12 03:39:46.805	2	1
129	ACTIVE	2026-06-12 03:39:46.805	2026-06-12 03:40:47.55	60	1
201	ACTIVE	2026-06-12 03:49:46.226	2026-06-12 03:52:07.353	141	5
130	AWAY	2026-06-12 03:40:47.55	2026-06-12 03:40:52.182	4	1
131	ACTIVE	2026-06-12 03:40:52.172	\N	0	1
132	ACTIVE	2026-06-12 03:40:52.182	2026-06-12 03:41:14.267	22	1
175	ACTIVE	2026-06-12 03:46:24.665	2026-06-12 03:46:46.329	21	5
124	ACTIVE	2026-06-12 03:39:17.563	2026-06-12 03:41:17.751	120	5
135	OFFLINE	2026-06-12 03:41:17.751	2026-06-12 03:41:18.113	0	5
136	ACTIVE	2026-06-12 03:41:18.113	\N	0	5
134	AWAY	2026-06-12 03:41:17.729	2026-06-12 03:41:18.135	0	5
137	ACTIVE	2026-06-12 03:41:18.135	2026-06-12 03:41:22.582	4	5
138	OFFLINE	2026-06-12 03:41:22.582	2026-06-12 03:41:35.908	13	5
140	ACTIVE	2026-06-12 03:41:43.304	\N	0	1
133	AWAY	2026-06-12 03:41:14.267	2026-06-12 03:41:43.321	29	1
141	ACTIVE	2026-06-12 03:41:43.321	2026-06-12 03:42:53.143	69	1
142	AWAY	2026-06-12 03:42:53.143	2026-06-12 03:43:11.333	18	1
143	ACTIVE	2026-06-12 03:43:11.326	\N	0	1
144	ACTIVE	2026-06-12 03:43:11.333	2026-06-12 03:43:59.315	47	1
139	ACTIVE	2026-06-12 03:41:35.908	2026-06-12 03:44:02.241	146	5
180	OFFLINE	2026-06-12 03:46:46.329	2026-06-12 03:46:46.631	0	5
145	AWAY	2026-06-12 03:43:59.315	2026-06-12 03:44:04.178	4	1
147	ACTIVE	2026-06-12 03:44:04.165	\N	0	1
148	ACTIVE	2026-06-12 03:44:04.178	2026-06-12 03:44:06.297	2	1
181	ACTIVE	2026-06-12 03:46:46.631	\N	0	5
149	AWAY	2026-06-12 03:44:06.297	2026-06-12 03:44:12.792	6	1
150	ACTIVE	2026-06-12 03:44:12.787	\N	0	1
151	ACTIVE	2026-06-12 03:44:12.792	2026-06-12 03:44:15.814	3	1
146	AWAY	2026-06-12 03:44:02.241	2026-06-12 03:44:22.964	20	5
153	OFFLINE	2026-06-12 03:44:22.964	2026-06-12 03:44:23.299	0	5
154	ACTIVE	2026-06-12 03:44:23.299	2026-06-12 03:44:23.358	0	5
155	ACTIVE	2026-06-12 03:44:23.358	2026-06-12 03:44:28.491	5	5
179	AWAY	2026-06-12 03:46:46.306	2026-06-12 03:46:46.654	0	5
152	AWAY	2026-06-12 03:44:15.814	2026-06-12 03:44:31.186	15	1
157	ACTIVE	2026-06-12 03:44:31.175	\N	0	1
156	AWAY	2026-06-12 03:44:28.491	2026-06-12 03:45:13.722	45	5
159	ACTIVE	2026-06-12 03:45:13.722	2026-06-12 03:45:18.731	5	5
158	ACTIVE	2026-06-12 03:44:31.186	2026-06-12 03:45:19.014	47	1
160	AWAY	2026-06-12 03:45:18.731	2026-06-12 03:45:22.543	3	5
162	OFFLINE	2026-06-12 03:45:22.543	2026-06-12 03:45:22.832	0	5
163	ACTIVE	2026-06-12 03:45:22.813	\N	0	5
164	ACTIVE	2026-06-12 03:45:22.832	2026-06-12 03:45:27.923	5	5
182	ACTIVE	2026-06-12 03:46:46.654	2026-06-12 03:46:51.743	5	5
161	AWAY	2026-06-12 03:45:19.014	2026-06-12 03:45:33.636	14	1
166	ACTIVE	2026-06-12 03:45:33.624	\N	0	1
165	AWAY	2026-06-12 03:45:27.923	2026-06-12 03:46:07.95	40	5
167	ACTIVE	2026-06-12 03:45:33.636	2026-06-12 03:46:09.688	36	1
168	ACTIVE	2026-06-12 03:46:07.95	2026-06-12 03:46:10.827	2	5
170	AWAY	2026-06-12 03:46:10.816	\N	0	5
171	OFFLINE	2026-06-12 03:46:10.827	2026-06-12 03:46:11.099	0	5
172	ACTIVE	2026-06-12 03:46:11.099	2026-06-12 03:46:11.129	0	5
173	ACTIVE	2026-06-12 03:46:11.129	2026-06-12 03:46:16.191	5	5
174	OFFLINE	2026-06-12 03:46:16.191	2026-06-12 03:46:24.665	8	5
169	AWAY	2026-06-12 03:46:09.688	2026-06-12 03:46:32.194	22	1
176	ACTIVE	2026-06-12 03:46:32.189	\N	0	1
178	AWAY	2026-06-12 03:46:44.565	2026-06-12 03:46:52.507	7	1
184	ACTIVE	2026-06-12 03:46:52.486	\N	0	1
183	AWAY	2026-06-12 03:46:51.743	2026-06-12 03:46:59.46	7	5
185	ACTIVE	2026-06-12 03:46:52.507	2026-06-12 03:47:00.866	8	1
186	ACTIVE	2026-06-12 03:46:59.46	2026-06-12 03:47:04.468	5	5
202	ACTIVE	2026-06-12 03:50:13.633	2026-06-12 03:52:07.663	114	1
187	AWAY	2026-06-12 03:47:00.866	2026-06-12 03:47:10.782	9	1
189	ACTIVE	2026-06-12 03:47:10.771	\N	0	1
188	AWAY	2026-06-12 03:47:04.468	2026-06-12 03:49:03.003	118	5
190	ACTIVE	2026-06-12 03:47:10.782	2026-06-12 03:49:04.728	113	1
191	ACTIVE	2026-06-12 03:49:03.003	2026-06-12 03:49:07.996	4	5
192	AWAY	2026-06-12 03:49:04.728	2026-06-12 03:49:11.221	6	1
194	ACTIVE	2026-06-12 03:49:11.204	\N	0	1
195	ACTIVE	2026-06-12 03:49:11.221	2026-06-12 03:49:33.051	21	1
193	AWAY	2026-06-12 03:49:07.996	2026-06-12 03:49:34.264	26	5
204	AWAY	2026-06-12 03:52:07.353	2026-06-12 03:52:18.191	10	5
196	AWAY	2026-06-12 03:49:33.051	2026-06-12 03:49:37.057	4	1
198	ACTIVE	2026-06-12 03:49:37.051	\N	0	1
199	ACTIVE	2026-06-12 03:49:37.057	2026-06-12 03:49:39.304	2	1
197	OFFLINE	2026-06-12 03:49:34.264	2026-06-12 03:49:46.226	11	5
200	AWAY	2026-06-12 03:49:39.304	2026-06-12 03:50:13.628	34	1
203	ACTIVE	2026-06-12 03:50:13.628	\N	0	1
205	AWAY	2026-06-12 03:52:07.663	2026-06-12 03:52:18.507	10	1
207	ACTIVE	2026-06-12 03:52:18.507	2026-06-12 03:52:19.54	1	1
213	AWAY	2026-06-12 03:52:27.364	2026-06-12 03:53:53.665	86	5
206	ACTIVE	2026-06-12 03:52:18.191	2026-06-12 03:52:21.643	3	5
210	OFFLINE	2026-06-12 03:52:21.643	2026-06-12 03:52:22.183	0	5
211	ACTIVE	2026-06-12 03:52:22.183	\N	0	5
209	AWAY	2026-06-12 03:52:21.619	2026-06-12 03:52:22.211	0	5
212	ACTIVE	2026-06-12 03:52:22.211	2026-06-12 03:52:27.364	5	5
208	AWAY	2026-06-12 03:52:19.54	2026-06-12 03:52:27.523	7	1
214	ACTIVE	2026-06-12 03:52:27.5	\N	0	1
215	ACTIVE	2026-06-12 03:52:27.523	2026-06-12 03:53:54.862	87	1
216	ACTIVE	2026-06-12 03:53:53.665	2026-06-12 03:53:58.676	5	5
218	AWAY	2026-06-12 03:53:58.676	2026-06-12 03:54:22.444	23	5
219	ACTIVE	2026-06-12 03:54:00.197	\N	0	1
217	AWAY	2026-06-12 03:53:54.862	2026-06-12 03:54:00.215	5	1
220	ACTIVE	2026-06-12 03:54:00.215	2026-06-12 03:54:23.055	22	1
221	ACTIVE	2026-06-12 03:54:22.444	2026-06-12 03:54:27.443	4	5
223	AWAY	2026-06-12 03:54:27.443	2026-06-12 03:54:50.412	22	5
222	AWAY	2026-06-12 03:54:23.055	2026-06-12 03:54:42.275	19	1
224	ACTIVE	2026-06-12 03:54:42.267	\N	0	1
225	ACTIVE	2026-06-12 03:54:42.275	2026-06-12 03:54:52.915	10	1
226	ACTIVE	2026-06-12 03:54:50.412	2026-06-12 03:54:55.428	5	5
228	AWAY	2026-06-12 03:54:55.428	2026-06-12 03:55:06.592	11	5
231	ACTIVE	2026-06-12 03:55:13.764	2026-06-12 03:55:32.047	18	1
230	ACTIVE	2026-06-12 03:55:13.751	\N	0	1
227	AWAY	2026-06-12 03:54:52.915	2026-06-12 03:55:13.764	20	1
229	ACTIVE	2026-06-12 03:55:06.592	2026-06-12 03:55:34.475	27	5
233	AWAY	2026-06-12 03:55:34.475	2026-06-12 03:56:09.718	35	5
232	AWAY	2026-06-12 03:55:32.047	2026-06-12 03:55:40.831	8	1
234	ACTIVE	2026-06-12 03:55:40.83	\N	0	1
235	ACTIVE	2026-06-12 03:55:40.831	2026-06-12 03:56:02.175	21	1
236	AWAY	2026-06-12 03:56:02.175	2026-06-12 04:12:27.9	985	1
238	OFFLINE	2026-06-12 04:12:27.9	2026-06-12 04:15:05.967	158	1
237	OFFLINE	2026-06-12 03:56:09.718	2026-06-12 04:15:34.693	1164	5
240	ACTIVE	2026-06-12 04:15:34.693	2026-06-12 04:15:37.424	2	5
241	AWAY	2026-06-12 04:15:37.424	2026-06-12 04:15:41.983	4	5
239	ACTIVE	2026-06-12 04:15:05.967	2026-06-12 04:16:06.345	60	1
292	AWAY	2026-06-12 04:35:38.765	2026-06-12 04:36:05.374	26	5
244	ACTIVE	2026-06-12 04:16:42.36	\N	0	1
243	AWAY	2026-06-12 04:16:06.345	2026-06-12 04:16:42.393	36	1
245	ACTIVE	2026-06-12 04:16:42.393	2026-06-12 04:20:08.521	206	1
246	AWAY	2026-06-12 04:20:08.521	2026-06-12 04:20:13.145	4	1
247	ACTIVE	2026-06-12 04:20:13.145	2026-06-12 04:20:18.351	5	1
248	AWAY	2026-06-12 04:20:18.351	2026-06-12 04:25:37.109	318	1
249	ACTIVE	2026-06-12 04:25:37.109	2026-06-12 04:25:42.562	5	1
250	AWAY	2026-06-12 04:25:42.562	2026-06-12 04:25:49.12	6	1
251	ACTIVE	2026-06-12 04:25:49.12	2026-06-12 04:27:54.422	125	1
252	AWAY	2026-06-12 04:27:54.422	2026-06-12 04:28:51.891	57	1
253	ACTIVE	2026-06-12 04:28:51.891	2026-06-12 04:29:05.995	14	1
242	ACTIVE	2026-06-12 04:15:41.983	2026-06-12 04:29:09.46	807	5
254	AWAY	2026-06-12 04:29:05.995	2026-06-12 04:29:22.32	16	1
256	ACTIVE	2026-06-12 04:29:22.315	\N	0	1
257	ACTIVE	2026-06-12 04:29:22.32	2026-06-12 04:29:25.408	3	1
293	AWAY	2026-06-12 04:35:38.777	2026-06-12 04:36:05.794	27	1
258	AWAY	2026-06-12 04:29:25.408	2026-06-12 04:29:30.042	4	1
259	ACTIVE	2026-06-12 04:29:29.993	\N	0	1
260	ACTIVE	2026-06-12 04:29:30.042	2026-06-12 04:30:12.101	42	1
261	AWAY	2026-06-12 04:30:12.101	2026-06-12 04:30:15.752	3	1
262	ACTIVE	2026-06-12 04:30:15.733	\N	0	1
263	ACTIVE	2026-06-12 04:30:15.752	2026-06-12 04:30:20.549	4	1
294	ACTIVE	2026-06-12 04:36:05.374	2026-06-12 04:36:10.666	5	5
264	AWAY	2026-06-12 04:30:20.549	2026-06-12 04:30:21.703	1	1
265	ACTIVE	2026-06-12 04:30:21.699	\N	0	1
266	ACTIVE	2026-06-12 04:30:21.703	2026-06-12 04:30:23.245	1	1
267	OFFLINE	2026-06-12 04:30:23.245	2026-06-12 04:30:25.853	2	1
268	ACTIVE	2026-06-12 04:30:25.851	\N	0	1
269	ACTIVE	2026-06-12 04:30:25.853	2026-06-12 04:30:26.527	0	1
255	AWAY	2026-06-12 04:29:09.46	2026-06-12 04:30:34.782	85	5
270	AWAY	2026-06-12 04:30:26.527	2026-06-12 04:31:08.604	42	1
271	ACTIVE	2026-06-12 04:30:34.782	2026-06-12 04:31:20.25	45	5
295	ACTIVE	2026-06-12 04:36:05.794	2026-06-12 04:36:10.695	4	1
274	AWAY	2026-06-12 04:31:33.336	\N	0	1
272	ACTIVE	2026-06-12 04:31:08.604	2026-06-12 04:31:33.352	24	1
273	AWAY	2026-06-12 04:31:20.25	2026-06-12 04:31:33.764	13	5
276	ACTIVE	2026-06-12 04:31:33.764	2026-06-12 04:31:39.51	5	5
277	AWAY	2026-06-12 04:31:39.51	2026-06-12 04:31:44.761	5	5
278	ACTIVE	2026-06-12 04:31:44.742	\N	0	5
279	ACTIVE	2026-06-12 04:31:44.761	2026-06-12 04:31:47.097	2	5
296	AWAY	2026-06-12 04:36:10.666	2026-06-12 04:37:37.248	86	5
280	OFFLINE	2026-06-12 04:31:47.097	2026-06-12 04:31:49.757	2	5
281	ACTIVE	2026-06-12 04:31:49.751	\N	0	5
282	ACTIVE	2026-06-12 04:31:49.757	2026-06-12 04:31:52.446	2	5
275	OFFLINE	2026-06-12 04:31:33.352	2026-06-12 04:32:00.653	27	1
285	ACTIVE	2026-06-12 04:32:02.099	\N	0	5
283	AWAY	2026-06-12 04:31:52.446	2026-06-12 04:32:02.121	9	5
284	ACTIVE	2026-06-12 04:32:00.653	2026-06-12 04:33:26.902	86	1
286	ACTIVE	2026-06-12 04:32:02.121	2026-06-12 04:33:27.235	85	5
288	AWAY	2026-06-12 04:33:27.235	2026-06-12 04:33:37.292	10	5
297	AWAY	2026-06-12 04:36:10.695	2026-06-12 04:37:37.559	86	1
287	AWAY	2026-06-12 04:33:26.902	2026-06-12 04:34:05.753	38	1
290	ACTIVE	2026-06-12 04:34:05.742	\N	0	1
289	ACTIVE	2026-06-12 04:33:37.292	2026-06-12 04:35:38.765	121	5
291	ACTIVE	2026-06-12 04:34:05.753	2026-06-12 04:35:38.777	93	1
299	ACTIVE	2026-06-12 04:37:37.559	2026-06-12 04:37:42.493	4	1
298	ACTIVE	2026-06-12 04:37:37.248	2026-06-12 04:37:42.506	5	5
301	AWAY	2026-06-12 04:37:42.506	2026-06-12 04:38:09.917	27	5
300	AWAY	2026-06-12 04:37:42.493	2026-06-12 04:38:40.301	57	1
303	ACTIVE	2026-06-12 04:38:40.301	2026-06-12 04:38:45.212	4	1
302	ACTIVE	2026-06-12 04:38:09.917	2026-06-12 04:38:45.246	35	5
318	ACTIVE	2026-06-12 04:43:45.544	2026-06-12 04:43:49.471	3	5
304	AWAY	2026-06-12 04:38:45.212	2026-06-12 04:39:39.969	54	1
307	ACTIVE	2026-06-12 04:39:39.969	\N	0	1
306	ACTIVE	2026-06-12 04:39:39.972	2026-06-12 04:40:02.095	22	1
308	AWAY	2026-06-12 04:40:02.095	2026-06-12 04:40:25.279	23	1
305	AWAY	2026-06-12 04:38:45.246	2026-06-12 04:40:29.173	103	5
310	ACTIVE	2026-06-12 04:40:25.279	2026-06-12 04:40:35.891	10	1
311	ACTIVE	2026-06-12 04:40:29.173	2026-06-12 04:41:36.155	66	5
330	ACTIVE	2026-06-12 04:47:11.878	2026-06-12 04:47:14.843	2	1
313	AWAY	2026-06-12 04:41:36.155	2026-06-12 04:41:37.873	1	5
315	ACTIVE	2026-06-12 04:41:37.873	2026-06-12 04:41:42.409	4	5
316	AWAY	2026-06-12 04:41:42.409	2026-06-12 04:43:45.514	123	5
317	ACTIVE	2026-06-12 04:43:45.514	\N	0	5
314	ACTIVE	2026-06-12 04:41:37.853	2026-06-12 04:43:45.544	127	5
319	OFFLINE	2026-06-12 04:43:49.471	2026-06-12 04:45:43.392	113	5
320	ACTIVE	2026-06-12 04:45:43.381	\N	0	5
321	ACTIVE	2026-06-12 04:45:43.392	2026-06-12 04:45:45.332	1	5
323	ACTIVE	2026-06-12 04:45:51.163	2026-06-12 04:46:00.33	9	3
312	AWAY	2026-06-12 04:40:35.891	2026-06-12 04:46:05.051	329	1
325	ACTIVE	2026-06-12 04:46:05.051	2026-06-12 04:46:39.315	34	1
326	AWAY	2026-06-12 04:46:39.315	2026-06-12 04:46:42.236	2	1
327	OFFLINE	2026-06-12 04:46:42.236	2026-06-12 04:47:05.888	23	1
328	ACTIVE	2026-06-12 04:47:05.888	2026-06-12 04:47:11.16	5	1
329	AWAY	2026-06-12 04:47:11.16	2026-06-12 04:47:11.878	0	1
331	OFFLINE	2026-06-12 04:47:14.843	2026-06-12 04:47:53.109	38	1
332	ACTIVE	2026-06-12 04:47:53.109	2026-06-12 04:48:07.625	14	1
333	AWAY	2026-06-12 04:48:07.625	2026-06-12 04:48:27.651	20	1
334	OFFLINE	2026-06-12 04:48:27.651	2026-06-12 05:00:31.799	724	1
335	ACTIVE	2026-06-12 05:00:31.799	2026-06-12 05:00:31.86	0	1
336	AWAY	2026-06-12 05:00:31.86	2026-06-12 05:00:35.648	3	1
337	ACTIVE	2026-06-12 05:00:35.648	2026-06-12 05:05:40.671	305	1
338	AWAY	2026-06-12 05:05:40.671	2026-06-12 05:10:30.745	290	1
339	ACTIVE	2026-06-12 05:10:30.745	2026-06-12 05:10:45.04	14	1
340	AWAY	2026-06-12 05:10:45.04	2026-06-12 05:11:04.398	19	1
341	OFFLINE	2026-06-12 05:11:04.398	2026-06-12 05:15:28.905	264	1
342	ACTIVE	2026-06-12 05:15:28.905	2026-06-12 05:16:13.201	44	1
343	AWAY	2026-06-12 05:16:13.201	2026-06-12 05:16:33.491	20	1
344	OFFLINE	2026-06-12 05:16:33.491	2026-06-12 05:21:27.833	294	1
345	ACTIVE	2026-06-12 05:21:27.833	2026-06-12 05:21:27.888	0	1
346	AWAY	2026-06-12 05:21:27.888	2026-06-12 05:21:32.041	4	1
347	ACTIVE	2026-06-12 05:21:32.041	2026-06-12 05:21:33.002	0	1
348	OFFLINE	2026-06-12 05:21:33.002	2026-06-12 05:22:14.802	41	1
322	OFFLINE	2026-06-12 04:45:45.332	2026-06-12 05:24:22.817	2317	5
324	OFFLINE	2026-06-12 04:46:00.33	2026-06-12 09:25:15.822	16755	3
309	ACTIVE	2026-06-12 04:40:25.263	2026-06-12 11:21:14.346	24049	1
349	ACTIVE	2026-06-12 05:22:14.802	2026-06-12 05:22:18.19	3	1
350	AWAY	2026-06-12 05:22:18.19	2026-06-12 05:22:23.122	4	1
351	OFFLINE	2026-06-12 05:22:23.122	2026-06-12 05:22:28.439	5	1
352	ACTIVE	2026-06-12 05:22:28.439	2026-06-12 05:22:41.134	12	1
353	AWAY	2026-06-12 05:22:41.134	2026-06-12 05:22:46.163	5	1
354	OFFLINE	2026-06-12 05:22:46.163	2026-06-12 05:23:44.762	58	1
355	ACTIVE	2026-06-12 05:23:44.762	2026-06-12 05:24:13.519	28	1
357	ACTIVE	2026-06-12 05:24:22.817	2026-06-12 05:24:39.708	16	5
356	OFFLINE	2026-06-12 05:24:13.519	2026-06-12 05:24:43.835	30	1
359	ACTIVE	2026-06-12 05:24:43.835	2026-06-12 05:26:39.541	115	1
360	AWAY	2026-06-12 05:26:39.541	2026-06-12 05:26:43.43	3	1
361	OFFLINE	2026-06-12 05:26:43.43	2026-06-12 05:39:55.676	792	1
362	ACTIVE	2026-06-12 05:39:55.676	2026-06-12 05:40:01.12	5	1
363	AWAY	2026-06-12 05:40:01.12	2026-06-12 05:40:03.874	2	1
364	ACTIVE	2026-06-12 05:40:03.874	2026-06-12 05:40:25.712	21	1
365	AWAY	2026-06-12 05:40:25.712	2026-06-12 05:40:32.124	6	1
366	ACTIVE	2026-06-12 05:40:32.124	2026-06-12 05:43:54.568	202	1
367	AWAY	2026-06-12 05:43:54.568	2026-06-12 05:43:58.553	3	1
368	OFFLINE	2026-06-12 05:43:58.553	2026-06-12 05:45:17.302	78	1
369	ACTIVE	2026-06-12 05:45:17.302	2026-06-12 05:45:33.92	16	1
370	AWAY	2026-06-12 05:45:33.92	2026-06-12 05:45:53.777	19	1
371	OFFLINE	2026-06-12 05:45:53.777	2026-06-12 05:46:40.812	47	1
372	ACTIVE	2026-06-12 05:46:40.812	2026-06-12 05:46:42.509	1	1
373	AWAY	2026-06-12 05:46:42.509	2026-06-12 05:46:46.387	3	1
374	OFFLINE	2026-06-12 05:46:46.387	2026-06-12 05:50:31.979	225	1
375	ACTIVE	2026-06-12 05:50:31.979	2026-06-12 05:50:32.017	0	1
376	ACTIVE	2026-06-12 05:50:32.017	2026-06-12 05:51:56.421	84	1
377	AWAY	2026-06-12 05:51:56.421	2026-06-12 05:52:00.431	4	1
379	ACTIVE	2026-06-12 09:25:15.822	2026-06-12 09:31:10.755	354	3
380	AWAY	2026-06-12 09:31:10.755	2026-06-12 09:43:00.82	710	3
381	ACTIVE	2026-06-12 09:43:00.82	2026-06-12 09:46:05.362	184	3
378	OFFLINE	2026-06-12 05:52:00.431	2026-06-12 11:15:54.197	19433	1
382	AWAY	2026-06-12 09:46:05.362	2026-06-12 09:46:13.395	8	3
383	ACTIVE	2026-06-12 09:46:13.388	\N	0	3
384	ACTIVE	2026-06-12 09:46:13.395	2026-06-12 10:01:26.021	912	3
385	AWAY	2026-06-12 10:01:26.021	2026-06-12 10:03:08.492	102	3
386	ACTIVE	2026-06-12 10:03:08.471	\N	0	3
387	ACTIVE	2026-06-12 10:03:08.492	2026-06-12 10:06:36.306	207	3
408	ACTIVE	2026-06-12 11:15:54.197	2026-06-12 11:15:54.297	0	1
388	AWAY	2026-06-12 10:06:36.306	2026-06-12 10:06:42.719	6	3
389	ACTIVE	2026-06-12 10:06:42.712	\N	0	3
390	ACTIVE	2026-06-12 10:06:42.719	2026-06-12 10:23:30.747	1008	3
391	AWAY	2026-06-12 10:23:30.747	2026-06-12 10:31:45.923	495	3
392	ACTIVE	2026-06-12 10:31:45.923	2026-06-12 10:37:05.748	319	3
393	AWAY	2026-06-12 10:37:05.748	2026-06-12 10:56:20.793	1155	3
394	ACTIVE	2026-06-12 10:56:20.793	2026-06-12 11:03:40.766	439	3
395	AWAY	2026-06-12 11:03:40.766	2026-06-12 11:03:55.774	15	3
396	ACTIVE	2026-06-12 11:03:55.774	2026-06-12 11:09:26.996	331	3
397	AWAY	2026-06-12 11:09:26.996	2026-06-12 11:15:01.974	334	3
398	ACTIVE	2026-06-12 11:15:01.974	2026-06-12 11:15:02.401	0	3
399	AWAY	2026-06-12 11:15:02.401	2026-06-12 11:15:11.84	9	3
400	ACTIVE	2026-06-12 11:15:11.827	\N	0	3
401	ACTIVE	2026-06-12 11:15:11.84	2026-06-12 11:15:12.86	1	3
409	OFFLINE	2026-06-12 11:15:54.297	2026-06-12 11:15:56.126	1	1
402	AWAY	2026-06-12 11:15:12.86	2026-06-12 11:15:18.543	5	3
403	ACTIVE	2026-06-12 11:15:18.521	\N	0	3
404	ACTIVE	2026-06-12 11:15:18.543	2026-06-12 11:15:20.758	2	3
405	AWAY	2026-06-12 11:15:20.758	2026-06-12 11:15:21.319	0	3
406	ACTIVE	2026-06-12 11:15:21.313	\N	0	3
410	ACTIVE	2026-06-12 11:15:56.126	2026-06-12 11:15:59.372	3	1
411	AWAY	2026-06-12 11:15:59.372	2026-06-12 11:16:14.393	15	1
412	OFFLINE	2026-06-12 11:16:14.393	2026-06-12 11:20:29.631	255	1
413	ACTIVE	2026-06-12 11:20:29.631	2026-06-12 11:21:14.308	44	1
415	OFFLINE	2026-06-12 11:21:14.346	2026-06-12 11:21:15.154	0	1
414	AWAY	2026-06-12 11:21:14.308	2026-06-12 11:21:15.286	0	1
417	ACTIVE	2026-06-12 11:21:15.286	2026-06-12 11:21:19.899	4	1
418	AWAY	2026-06-12 11:21:19.899	2026-06-12 11:21:46.909	27	1
419	OFFLINE	2026-06-12 11:21:46.909	2026-06-12 11:22:37.849	50	1
420	ACTIVE	2026-06-12 11:22:37.849	\N	0	1
430	ACTIVE	2026-06-12 11:32:36.934	2026-06-12 11:39:57.739	440	3
416	ACTIVE	2026-06-12 11:21:15.154	2026-06-12 11:22:37.872	82	1
422	ACTIVE	2026-06-12 11:22:37.872	2026-06-12 11:23:16.704	38	1
423	AWAY	2026-06-12 11:23:16.704	\N	0	1
421	ACTIVE	2026-06-12 11:22:37.87	2026-06-12 11:23:16.727	38	1
424	OFFLINE	2026-06-12 11:23:16.727	2026-06-12 11:23:17.083	0	1
425	ACTIVE	2026-06-12 11:23:17.083	2026-06-12 11:23:22.677	5	1
426	AWAY	2026-06-12 11:23:22.677	2026-06-12 11:30:23.417	420	1
407	ACTIVE	2026-06-12 11:15:21.319	2026-06-12 11:30:41.151	919	3
429	ACTIVE	2026-06-12 11:32:36.891	\N	0	3
428	AWAY	2026-06-12 11:30:41.151	2026-06-12 11:32:36.934	115	3
427	ACTIVE	2026-06-12 11:30:23.417	2026-06-12 11:33:23.302	179	1
431	AWAY	2026-06-12 11:33:23.302	2026-06-12 11:33:28.129	4	1
432	OFFLINE	2026-06-12 11:33:28.129	2026-06-12 11:34:56.084	87	1
433	ACTIVE	2026-06-12 11:34:56.084	2026-06-12 11:40:21.124	325	1
435	AWAY	2026-06-12 11:40:21.124	2026-06-12 11:40:25.016	3	1
434	AWAY	2026-06-12 11:39:57.739	2026-06-12 11:47:35.01	457	3
437	ACTIVE	2026-06-12 11:47:35.01	2026-06-12 11:53:30.77	355	3
438	AWAY	2026-06-12 11:53:30.77	2026-06-12 11:54:05.745	34	3
439	ACTIVE	2026-06-12 11:54:05.745	2026-06-12 12:09:00.765	895	3
440	AWAY	2026-06-12 12:09:00.765	2026-06-12 12:10:40.793	100	3
436	OFFLINE	2026-06-12 11:40:25.016	2026-06-12 12:17:08.789	2203	1
442	ACTIVE	2026-06-12 12:17:08.789	2026-06-12 12:17:08.909	0	1
443	ACTIVE	2026-06-12 12:17:08.909	2026-06-12 12:17:14.895	5	1
444	AWAY	2026-06-12 12:17:14.895	2026-06-12 12:17:20.513	5	1
441	ACTIVE	2026-06-12 12:10:40.793	2026-06-12 12:19:26.488	525	3
451	ACTIVE	2026-06-12 12:28:15.524	2026-06-12 12:39:28.383	672	3
446	AWAY	2026-06-12 12:19:26.488	2026-06-12 12:19:33.32	6	3
447	ACTIVE	2026-06-12 12:19:33.316	\N	0	3
448	ACTIVE	2026-06-12 12:19:33.32	2026-06-12 12:27:59.369	506	3
449	AWAY	2026-06-12 12:27:59.369	2026-06-12 12:28:15.524	16	3
450	ACTIVE	2026-06-12 12:28:15.511	\N	0	3
454	ACTIVE	2026-06-12 12:39:44.215	2026-06-12 12:44:45.81	301	3
452	AWAY	2026-06-12 12:39:28.383	2026-06-12 12:39:44.215	15	3
453	ACTIVE	2026-06-12 12:39:44.194	\N	0	3
455	AWAY	2026-06-12 12:44:45.81	2026-06-12 12:48:00.776	194	3
456	ACTIVE	2026-06-12 12:48:00.776	2026-06-12 13:02:00.756	839	3
445	OFFLINE	2026-06-12 12:17:20.513	2026-06-12 13:11:16.367	3235	1
458	ACTIVE	2026-06-12 13:11:16.367	2026-06-12 13:11:21.848	5	1
459	AWAY	2026-06-12 13:11:21.848	2026-06-12 13:12:13.245	51	1
460	ACTIVE	2026-06-12 13:12:13.245	2026-06-12 13:15:18.741	185	1
461	AWAY	2026-06-12 13:15:18.741	2026-06-12 13:15:23.472	4	1
462	ACTIVE	2026-06-12 13:15:23.472	2026-06-12 13:15:31.755	8	1
457	AWAY	2026-06-12 13:02:00.756	2026-06-12 13:20:08.626	1087	3
358	OFFLINE	2026-06-12 05:24:39.708	2026-06-12 15:33:41.013	36541	5
463	AWAY	2026-06-12 13:15:31.755	2026-06-12 13:16:49.738	77	1
464	ACTIVE	2026-06-12 13:16:49.724	\N	0	1
465	ACTIVE	2026-06-12 13:16:49.738	2026-06-12 13:19:59.838	190	1
522	ACTIVE	2026-06-12 15:19:02.818	2026-06-12 15:19:03.868	1	3
466	OFFLINE	2026-06-12 13:19:59.838	2026-06-12 13:20:08.445	8	1
467	ACTIVE	2026-06-12 13:20:08.427	\N	0	1
469	ACTIVE	2026-06-12 13:20:08.445	2026-06-12 13:21:44.766	96	1
468	ACTIVE	2026-06-12 13:20:08.626	2026-06-12 13:21:52.207	103	3
471	AWAY	2026-06-12 13:21:52.207	2026-06-12 13:21:53.059	0	3
472	ACTIVE	2026-06-12 13:21:53.059	2026-06-12 13:22:09.941	16	3
473	OFFLINE	2026-06-12 13:22:09.941	2026-06-12 13:22:16.105	6	3
474	ACTIVE	2026-06-12 13:22:16.099	\N	0	3
470	OFFLINE	2026-06-12 13:21:44.766	2026-06-12 13:22:16.456	31	1
476	ACTIVE	2026-06-12 13:22:16.456	2026-06-12 13:23:02.573	46	1
475	ACTIVE	2026-06-12 13:22:16.105	2026-06-12 13:35:15.809	779	3
478	AWAY	2026-06-12 13:35:15.809	2026-06-12 13:40:10.774	294	3
479	ACTIVE	2026-06-12 13:40:10.774	2026-06-12 13:46:00.746	349	3
480	AWAY	2026-06-12 13:46:00.746	2026-06-12 13:50:15.803	255	3
477	AWAY	2026-06-12 13:23:02.573	2026-06-12 14:02:30.305	2367	1
482	ACTIVE	2026-06-12 14:02:30.305	2026-06-12 14:02:35.702	5	1
483	AWAY	2026-06-12 14:02:35.702	2026-06-12 14:02:36.373	0	1
523	AWAY	2026-06-12 15:19:03.868	2026-06-12 15:20:28.513	84	3
485	AWAY	2026-06-12 14:02:43.084	\N	0	1
484	ACTIVE	2026-06-12 14:02:36.373	2026-06-12 14:02:43.097	6	1
486	OFFLINE	2026-06-12 14:02:43.097	2026-06-12 14:02:43.585	0	1
487	ACTIVE	2026-06-12 14:02:43.585	2026-06-12 14:02:48.514	4	1
488	AWAY	2026-06-12 14:02:48.514	2026-06-12 14:03:23.128	34	1
481	ACTIVE	2026-06-12 13:50:15.803	2026-06-12 14:05:50.785	934	3
490	AWAY	2026-06-12 14:05:50.785	2026-06-12 14:10:05.773	254	3
491	ACTIVE	2026-06-12 14:10:05.773	2026-06-12 14:16:10.767	364	3
492	AWAY	2026-06-12 14:16:10.767	2026-06-12 14:16:35.759	24	3
493	ACTIVE	2026-06-12 14:16:35.759	2026-06-12 14:18:16.232	100	3
494	AWAY	2026-06-12 14:18:16.232	2026-06-12 14:18:27.693	11	3
495	ACTIVE	2026-06-12 14:18:27.685	\N	0	3
496	ACTIVE	2026-06-12 14:18:27.693	2026-06-12 14:31:10.751	763	3
497	AWAY	2026-06-12 14:31:10.751	2026-06-12 14:31:21.251	10	3
498	ACTIVE	2026-06-12 14:31:21.251	2026-06-12 14:36:25.752	304	3
499	AWAY	2026-06-12 14:36:25.752	2026-06-12 14:37:20.748	54	3
500	ACTIVE	2026-06-12 14:37:20.748	2026-06-12 14:38:00.45	39	3
501	AWAY	2026-06-12 14:38:00.45	2026-06-12 14:52:11.119	850	3
489	OFFLINE	2026-06-12 14:03:23.128	2026-06-12 14:53:02.342	2979	1
503	ACTIVE	2026-06-12 14:53:02.342	2026-06-12 14:53:07.551	5	1
504	AWAY	2026-06-12 14:53:07.551	2026-06-12 14:53:07.697	0	1
505	ACTIVE	2026-06-12 14:53:07.697	2026-06-12 14:56:39.164	211	1
506	AWAY	2026-06-12 14:56:39.164	2026-06-12 14:56:59.076	19	1
507	OFFLINE	2026-06-12 14:56:59.076	2026-06-12 14:58:04.491	65	1
508	ACTIVE	2026-06-12 14:58:04.491	2026-06-12 14:59:37.106	92	1
524	ACTIVE	2026-06-12 15:20:28.513	2026-06-12 15:33:31.651	783	3
509	OFFLINE	2026-06-12 14:59:37.106	2026-06-12 14:59:44.782	7	1
502	ACTIVE	2026-06-12 14:52:11.119	2026-06-12 14:59:56.872	465	3
512	AWAY	2026-06-12 14:59:56.872	2026-06-12 15:00:29.55	32	3
511	ACTIVE	2026-06-12 14:59:44.782	2026-06-12 15:00:29.828	45	1
513	ACTIVE	2026-06-12 15:00:29.55	2026-06-12 15:01:07.405	37	3
515	AWAY	2026-06-12 15:01:07.383	\N	0	3
516	AWAY	2026-06-12 15:01:07.405	2026-06-12 15:01:07.65	0	3
517	ACTIVE	2026-06-12 15:01:07.648	\N	0	3
518	ACTIVE	2026-06-12 15:01:07.65	2026-06-12 15:01:12.747	5	3
519	AWAY	2026-06-12 15:01:12.747	2026-06-12 15:17:34.249	981	3
520	ACTIVE	2026-06-12 15:17:34.249	2026-06-12 15:17:39.229	4	3
521	AWAY	2026-06-12 15:17:39.229	2026-06-12 15:19:02.818	83	3
526	ACTIVE	2026-06-12 15:33:41.013	2026-06-12 15:33:56.374	15	5
548	ACTIVE	2026-06-12 15:56:43.372	2026-06-12 15:57:12.331	28	3
527	AWAY	2026-06-12 15:33:56.374	2026-06-12 15:33:59.63	3	5
528	ACTIVE	2026-06-12 15:33:59.625	\N	0	5
529	ACTIVE	2026-06-12 15:33:59.63	2026-06-12 15:34:06.284	6	5
530	AWAY	2026-06-12 15:34:06.284	2026-06-12 15:34:30.25	23	5
531	ACTIVE	2026-06-12 15:34:30.232	\N	0	5
532	ACTIVE	2026-06-12 15:34:30.25	2026-06-12 15:34:33.666	3	5
560	ACTIVE	2026-06-12 17:10:48.88	2026-06-12 17:11:07.11	18	1
533	AWAY	2026-06-12 15:34:33.666	2026-06-12 15:34:33.949	0	5
535	ACTIVE	2026-06-12 15:34:33.949	\N	0	5
534	ACTIVE	2026-06-12 15:34:33.951	2026-06-12 15:34:34.888	0	5
536	AWAY	2026-06-12 15:34:34.888	2026-06-12 15:35:06.361	31	5
537	OFFLINE	2026-06-12 15:35:06.361	2026-06-12 15:35:24.121	17	5
538	ACTIVE	2026-06-12 15:35:24.121	2026-06-12 15:35:29.912	5	5
539	AWAY	2026-06-12 15:35:29.912	2026-06-12 15:36:01.234	31	5
540	OFFLINE	2026-06-12 15:36:01.234	2026-06-12 15:36:05.148	3	5
541	ACTIVE	2026-06-12 15:36:05.148	2026-06-12 15:36:05.884	0	5
514	OFFLINE	2026-06-12 15:00:29.828	2026-06-12 15:36:12.023	2142	1
543	ACTIVE	2026-06-12 15:36:12.023	2026-06-12 15:36:46.085	34	1
544	AWAY	2026-06-12 15:36:46.085	2026-06-12 15:37:16.616	30	1
525	OFFLINE	2026-06-12 15:33:31.651	2026-06-12 15:56:29.345	1377	3
549	AWAY	2026-06-12 15:57:12.331	2026-06-12 15:57:12.519	0	3
546	AWAY	2026-06-12 15:56:29.345	2026-06-12 15:56:43.372	14	3
547	ACTIVE	2026-06-12 15:56:43.336	\N	0	3
550	ACTIVE	2026-06-12 15:57:12.512	\N	0	3
551	ACTIVE	2026-06-12 15:57:12.519	2026-06-12 17:04:06.529	4014	3
552	OFFLINE	2026-06-12 17:04:06.529	2026-06-12 17:04:24.673	18	3
553	ACTIVE	2026-06-12 17:04:24.649	\N	0	3
555	ACTIVE	2026-06-12 17:04:24.968	2026-06-12 17:09:44.608	319	4
545	OFFLINE	2026-06-12 15:37:16.616	2026-06-12 17:10:48.735	5612	1
557	ACTIVE	2026-06-12 17:10:48.735	\N	0	1
561	AWAY	2026-06-12 17:11:07.11	2026-06-12 17:11:08.578	1	1
558	AWAY	2026-06-12 17:10:48.876	\N	0	1
510	ACTIVE	2026-06-12 14:59:44.775	2026-06-12 17:10:48.88	7864	1
559	ACTIVE	2026-06-12 17:10:48.878	\N	0	1
562	ACTIVE	2026-06-12 17:11:08.578	2026-06-12 17:11:13.71	5	1
563	AWAY	2026-06-12 17:11:13.71	2026-06-12 17:11:22.819	9	1
556	AWAY	2026-06-12 17:09:44.608	2026-06-12 17:12:13.833	149	4
565	ACTIVE	2026-06-12 17:12:13.833	2026-06-12 17:12:18.854	5	4
564	ACTIVE	2026-06-12 17:11:22.819	2026-06-12 17:12:26.239	63	1
567	AWAY	2026-06-12 17:12:26.239	2026-06-12 17:12:42.601	16	1
568	OFFLINE	2026-06-12 17:12:42.601	2026-06-12 17:13:15.682	33	1
569	ACTIVE	2026-06-12 17:13:15.682	2026-06-12 17:13:42.228	26	1
570	AWAY	2026-06-12 17:13:42.228	2026-06-12 17:14:01.715	19	1
574	ACTIVE	2026-06-12 17:30:00.634	2026-06-12 17:30:25.661	25	1
572	ACTIVE	2026-06-12 17:30:00.606	\N	0	1
571	OFFLINE	2026-06-12 17:14:01.715	2026-06-12 17:30:00.634	958	1
573	ACTIVE	2026-06-12 17:30:00.633	\N	0	1
575	AWAY	2026-06-12 17:30:25.661	2026-06-12 17:30:30.395	4	1
578	ACTIVE	2026-06-12 17:32:45.249	2026-06-12 17:32:50.409	5	4
566	AWAY	2026-06-12 17:12:18.854	2026-06-12 17:32:45.249	1226	4
577	ACTIVE	2026-06-12 17:32:45.235	\N	0	4
580	ACTIVE	2026-06-12 17:33:44.25	\N	0	4
542	OFFLINE	2026-06-12 15:36:05.884	2026-06-13 01:02:48.553	34002	5
554	ACTIVE	2026-06-12 17:04:24.673	2026-06-13 01:05:57.355	28892	3
579	AWAY	2026-06-12 17:32:50.409	2026-06-12 17:33:44.264	53	4
581	ACTIVE	2026-06-12 17:33:44.264	2026-06-12 17:33:45.609	1	4
582	AWAY	2026-06-12 17:33:45.609	2026-06-12 17:34:11.343	25	4
586	ACTIVE	2026-06-12 17:42:18.528	\N	0	1
583	ACTIVE	2026-06-12 17:34:11.312	\N	0	4
639	OFFLINE	2026-06-12 19:08:29.897	2026-06-12 19:13:47.192	317	1
585	ACTIVE	2026-06-12 17:42:18.469	\N	0	1
576	OFFLINE	2026-06-12 17:30:30.395	2026-06-12 17:42:18.559	708	1
587	ACTIVE	2026-06-12 17:42:18.559	2026-06-12 17:42:18.828	0	1
588	AWAY	2026-06-12 17:42:18.828	2026-06-12 17:42:23.809	4	1
584	ACTIVE	2026-06-12 17:34:11.343	2026-06-12 17:56:55.045	1363	4
589	OFFLINE	2026-06-12 17:42:23.809	2026-06-12 18:10:55.612	1711	1
591	ACTIVE	2026-06-12 18:10:55.612	2026-06-12 18:11:11.381	15	1
592	AWAY	2026-06-12 18:11:11.381	2026-06-12 18:11:31.462	20	1
593	OFFLINE	2026-06-12 18:11:31.462	2026-06-12 18:13:11.774	100	1
594	ACTIVE	2026-06-12 18:13:11.774	2026-06-12 18:13:11.888	0	1
595	AWAY	2026-06-12 18:13:11.888	2026-06-12 18:13:16.219	4	1
596	OFFLINE	2026-06-12 18:13:16.219	2026-06-12 18:22:39.229	563	1
597	ACTIVE	2026-06-12 18:22:39.229	2026-06-12 18:22:50.182	10	1
598	AWAY	2026-06-12 18:22:50.182	2026-06-12 18:22:55.016	4	1
599	OFFLINE	2026-06-12 18:22:55.016	2026-06-12 18:25:39.929	164	1
600	ACTIVE	2026-06-12 18:25:39.929	2026-06-12 18:25:40	0	1
601	AWAY	2026-06-12 18:25:40	2026-06-12 18:25:42.728	2	1
590	AWAY	2026-06-12 17:56:55.045	2026-06-12 18:33:54.411	2219	4
603	ACTIVE	2026-06-12 18:33:54.411	2026-06-12 18:34:10.816	16	4
604	AWAY	2026-06-12 18:34:10.816	2026-06-12 18:51:47.904	1057	4
605	ACTIVE	2026-06-12 18:51:47.904	2026-06-12 18:53:21.781	93	4
607	ACTIVE	2026-06-12 18:53:26.267	\N	0	4
606	AWAY	2026-06-12 18:53:21.781	2026-06-12 18:53:26.298	4	4
602	OFFLINE	2026-06-12 18:25:42.728	2026-06-12 19:00:27.644	2084	1
609	ACTIVE	2026-06-12 19:00:27.644	2026-06-12 19:00:31.486	3	1
610	AWAY	2026-06-12 19:00:31.486	2026-06-12 19:00:31.85	0	1
611	OFFLINE	2026-06-12 19:00:31.85	2026-06-12 19:00:34.56	2	1
612	ACTIVE	2026-06-12 19:00:34.56	2026-06-12 19:00:40.765	6	1
613	AWAY	2026-06-12 19:00:40.765	2026-06-12 19:00:42.616	1	1
614	ACTIVE	2026-06-12 19:00:42.616	2026-06-12 19:00:49.215	6	1
615	AWAY	2026-06-12 19:00:49.215	2026-06-12 19:00:53.183	3	1
616	OFFLINE	2026-06-12 19:00:53.183	2026-06-12 19:02:32.413	99	1
617	ACTIVE	2026-06-12 19:02:32.413	2026-06-12 19:02:32.52	0	1
618	AWAY	2026-06-12 19:02:32.52	2026-06-12 19:02:35.516	2	1
619	OFFLINE	2026-06-12 19:02:35.516	2026-06-12 19:03:31.831	56	1
620	ACTIVE	2026-06-12 19:03:31.831	2026-06-12 19:03:32.019	0	1
621	OFFLINE	2026-06-12 19:03:32.019	2026-06-12 19:03:34.057	2	1
622	ACTIVE	2026-06-12 19:03:34.057	2026-06-12 19:03:37.015	2	1
623	AWAY	2026-06-12 19:03:37.015	2026-06-12 19:03:44.067	7	1
643	ACTIVE	2026-06-12 19:13:47.192	2026-06-12 19:15:52.338	125	1
624	ACTIVE	2026-06-12 19:03:44.067	2026-06-12 19:03:50.582	6	1
626	OFFLINE	2026-06-12 19:03:50.582	2026-06-12 19:03:50.988	0	1
627	ACTIVE	2026-06-12 19:03:50.988	2026-06-12 19:03:56.666	5	1
608	ACTIVE	2026-06-12 18:53:26.298	2026-06-12 19:04:22.842	656	4
628	AWAY	2026-06-12 19:03:56.666	2026-06-12 19:04:31.478	34	1
629	AWAY	2026-06-12 19:04:22.842	2026-06-12 19:04:44.408	21	4
630	OFFLINE	2026-06-12 19:04:31.478	2026-06-12 19:06:36.946	125	1
632	ACTIVE	2026-06-12 19:06:36.946	2026-06-12 19:06:49.422	12	1
633	AWAY	2026-06-12 19:06:49.422	2026-06-12 19:06:49.456	0	1
634	OFFLINE	2026-06-12 19:06:49.456	2026-06-12 19:06:50.074	0	1
635	ACTIVE	2026-06-12 19:06:50.074	2026-06-12 19:06:51.958	1	1
636	AWAY	2026-06-12 19:06:51.958	2026-06-12 19:06:56.776	4	1
637	OFFLINE	2026-06-12 19:06:56.776	2026-06-12 19:07:14.442	17	1
638	ACTIVE	2026-06-12 19:07:14.442	2026-06-12 19:08:29.897	75	1
631	ACTIVE	2026-06-12 19:04:44.408	2026-06-12 19:10:57.522	373	4
640	AWAY	2026-06-12 19:10:57.522	2026-06-12 19:11:03.277	5	4
644	OFFLINE	2026-06-12 19:15:52.338	2026-06-12 19:36:21.958	1229	1
645	ACTIVE	2026-06-12 19:36:21.958	2026-06-12 19:36:22.666	0	1
646	AWAY	2026-06-12 19:36:22.666	\N	0	1
625	AWAY	2026-06-12 19:03:50.572	2026-06-12 19:36:22.679	1952	1
647	OFFLINE	2026-06-12 19:36:22.679	2026-06-12 19:36:23.318	0	1
648	ACTIVE	2026-06-12 19:36:23.318	2026-06-12 19:36:28.516	5	1
649	AWAY	2026-06-12 19:36:28.516	2026-06-12 19:36:41.018	12	1
650	OFFLINE	2026-06-12 19:36:41.018	2026-06-12 19:36:41.864	0	1
651	ACTIVE	2026-06-12 19:36:41.864	2026-06-12 19:36:46.844	4	1
652	AWAY	2026-06-12 19:36:46.844	2026-06-12 19:37:04.842	17	1
653	OFFLINE	2026-06-12 19:37:04.842	2026-06-12 19:37:05.089	0	1
654	ACTIVE	2026-06-12 19:37:05.089	2026-06-12 19:37:10.657	5	1
655	AWAY	2026-06-12 19:37:10.657	2026-06-12 19:37:15.66	5	1
656	OFFLINE	2026-06-12 19:37:15.66	2026-06-12 19:37:16.513	0	1
657	ACTIVE	2026-06-12 19:37:16.513	2026-06-12 19:37:21.343	4	1
658	AWAY	2026-06-12 19:37:21.343	2026-06-12 19:37:38.65	17	1
659	OFFLINE	2026-06-12 19:37:38.65	2026-06-12 19:37:39.295	0	1
660	ACTIVE	2026-06-12 19:37:39.295	2026-06-12 19:37:44.648	5	1
661	AWAY	2026-06-12 19:37:44.648	2026-06-12 19:37:47.185	2	1
662	ACTIVE	2026-06-12 19:37:47.185	2026-06-12 19:38:04.602	17	1
663	AWAY	2026-06-12 19:38:04.602	2026-06-12 19:38:27.767	23	1
664	ACTIVE	2026-06-12 19:38:27.767	2026-06-12 19:38:38.613	10	1
665	OFFLINE	2026-06-12 19:38:38.613	2026-06-12 19:43:12.741	274	1
666	ACTIVE	2026-06-12 19:43:12.741	2026-06-12 19:43:12.972	0	1
667	AWAY	2026-06-12 19:43:12.972	2026-06-12 19:43:15.531	2	1
668	OFFLINE	2026-06-12 19:43:15.531	2026-06-12 19:43:21.848	6	1
669	ACTIVE	2026-06-12 19:43:21.848	2026-06-12 19:43:27.46	5	1
670	AWAY	2026-06-12 19:43:27.46	2026-06-12 19:43:31.348	3	1
671	OFFLINE	2026-06-12 19:43:31.348	2026-06-12 19:52:05.11	513	1
672	ACTIVE	2026-06-12 19:52:05.11	2026-06-12 19:52:18.322	13	1
673	AWAY	2026-06-12 19:52:18.322	2026-06-12 19:52:22.209	3	1
674	OFFLINE	2026-06-12 19:52:22.209	2026-06-12 19:54:48.638	146	1
675	ACTIVE	2026-06-12 19:54:48.638	2026-06-12 19:54:51.754	3	1
676	AWAY	2026-06-12 19:54:51.754	2026-06-12 19:54:56.73	4	1
677	OFFLINE	2026-06-12 19:54:56.73	2026-06-12 19:55:25.056	28	1
678	ACTIVE	2026-06-12 19:55:25.056	2026-06-12 19:55:52.075	27	1
679	AWAY	2026-06-12 19:55:52.075	2026-06-12 19:55:57.03	4	1
680	OFFLINE	2026-06-12 19:55:57.03	2026-06-12 20:06:49.031	652	1
681	ACTIVE	2026-06-12 20:06:49.031	2026-06-12 20:06:58.374	9	1
682	AWAY	2026-06-12 20:06:58.374	2026-06-12 20:07:02.349	3	1
683	OFFLINE	2026-06-12 20:07:02.349	2026-06-12 20:28:17.019	1274	1
684	ACTIVE	2026-06-12 20:28:17.019	2026-06-12 20:28:25.683	8	1
685	AWAY	2026-06-12 20:28:25.683	2026-06-12 20:28:30.528	4	1
686	OFFLINE	2026-06-12 20:28:30.528	2026-06-12 20:40:34.455	723	1
687	ACTIVE	2026-06-12 20:40:34.455	2026-06-12 20:40:38.254	3	1
688	AWAY	2026-06-12 20:40:38.254	2026-06-12 20:40:43.118	4	1
689	OFFLINE	2026-06-12 20:40:43.118	2026-06-12 20:43:32.7	169	1
690	ACTIVE	2026-06-12 20:43:32.7	2026-06-12 20:44:02.798	30	1
691	AWAY	2026-06-12 20:44:02.798	2026-06-12 20:44:07.763	4	1
692	OFFLINE	2026-06-12 20:44:07.763	2026-06-12 21:00:10.924	963	1
693	ACTIVE	2026-06-12 21:00:10.924	2026-06-12 21:00:15.908	4	1
694	AWAY	2026-06-12 21:00:15.908	2026-06-12 21:00:18.928	3	1
642	ACTIVE	2026-06-12 19:11:03.277	2026-06-12 21:07:50.24	7006	4
641	ACTIVE	2026-06-12 19:11:03.254	2026-06-12 21:07:59.554	7016	4
700	AWAY	2026-06-12 21:00:26.575	2026-06-12 21:08:38.163	491	1
695	ACTIVE	2026-06-12 21:00:18.911	\N	0	1
696	ACTIVE	2026-06-12 21:00:18.928	2026-06-12 21:00:20.186	1	1
756	OFFLINE	2026-06-12 23:37:35.211	2026-06-12 23:37:37.023	1	1
697	AWAY	2026-06-12 21:00:20.186	2026-06-12 21:00:25.102	4	1
699	ACTIVE	2026-06-12 21:00:25.102	2026-06-12 21:00:26.575	1	1
701	AWAY	2026-06-12 21:07:50.24	2026-06-12 21:07:59.538	9	4
702	ACTIVE	2026-06-12 21:07:59.538	\N	0	4
703	ACTIVE	2026-06-12 21:07:59.554	2026-06-12 21:08:00.281	0	4
704	AWAY	2026-06-12 21:08:00.281	2026-06-12 21:08:10.457	10	4
705	ACTIVE	2026-06-12 21:08:10.434	\N	0	4
707	ACTIVE	2026-06-12 21:08:38.163	2026-06-12 21:08:40.372	2	1
698	ACTIVE	2026-06-12 21:00:25.077	2026-06-12 21:08:40.396	495	1
709	OFFLINE	2026-06-12 21:08:40.396	2026-06-12 21:08:41.834	1	1
710	ACTIVE	2026-06-12 21:08:41.834	\N	0	1
708	AWAY	2026-06-12 21:08:40.372	2026-06-12 21:08:41.87	1	1
711	ACTIVE	2026-06-12 21:08:41.87	2026-06-12 21:08:46.753	4	1
712	AWAY	2026-06-12 21:08:46.753	2026-06-12 21:09:11.208	24	1
713	ACTIVE	2026-06-12 21:09:11.208	2026-06-12 22:14:06.432	3895	1
714	AWAY	2026-06-12 22:14:06.432	2026-06-12 22:17:35.877	209	1
715	ACTIVE	2026-06-12 22:17:35.877	2026-06-12 22:21:52.126	256	1
716	AWAY	2026-06-12 22:21:52.126	2026-06-12 22:24:12.908	140	1
717	ACTIVE	2026-06-12 22:24:12.908	2026-06-12 22:24:24.525	11	1
718	AWAY	2026-06-12 22:24:24.525	2026-06-12 22:27:33.158	188	1
719	ACTIVE	2026-06-12 22:27:33.158	2026-06-12 22:27:33.473	0	1
757	ACTIVE	2026-06-12 23:37:37.023	2026-06-12 23:38:16.101	39	1
720	AWAY	2026-06-12 22:27:33.473	2026-06-12 22:50:25.069	1371	1
723	ACTIVE	2026-06-12 22:50:25.069	\N	0	1
722	ACTIVE	2026-06-12 22:50:25.072	2026-06-12 22:50:39.374	14	1
724	AWAY	2026-06-12 22:50:39.374	2026-06-12 22:51:23.07	43	1
725	ACTIVE	2026-06-12 22:51:23.07	2026-06-12 22:51:53.208	30	1
726	AWAY	2026-06-12 22:51:53.208	2026-06-12 22:55:16.642	203	1
706	ACTIVE	2026-06-12 21:08:10.457	2026-06-12 23:00:04.532	6714	4
758	AWAY	2026-06-12 23:38:16.101	2026-06-12 23:47:56.073	579	1
728	AWAY	2026-06-12 23:00:04.532	2026-06-12 23:00:34.142	29	4
730	ACTIVE	2026-06-12 23:00:34.142	\N	0	4
727	ACTIVE	2026-06-12 22:55:16.642	2026-06-12 23:02:51.62	454	1
731	AWAY	2026-06-12 23:02:51.62	\N	0	1
721	ACTIVE	2026-06-12 22:50:25.07	2026-06-12 23:02:51.652	746	1
732	OFFLINE	2026-06-12 23:02:51.652	2026-06-12 23:10:59.232	487	1
733	ACTIVE	2026-06-12 23:10:59.232	2026-06-12 23:13:58.252	179	1
734	AWAY	2026-06-12 23:13:58.252	2026-06-12 23:14:07.004	8	1
736	ACTIVE	2026-06-12 23:14:07.004	2026-06-12 23:14:11.827	4	1
737	AWAY	2026-06-12 23:14:11.827	2026-06-12 23:14:30.284	18	1
738	ACTIVE	2026-06-12 23:14:30.284	\N	0	1
735	ACTIVE	2026-06-12 23:14:06.987	2026-06-12 23:14:30.312	23	1
739	ACTIVE	2026-06-12 23:14:30.312	2026-06-12 23:14:33.021	2	1
759	ACTIVE	2026-06-12 23:47:56.073	2026-06-12 23:48:01.665	5	1
740	AWAY	2026-06-12 23:14:33.021	2026-06-12 23:14:42.1	9	1
741	ACTIVE	2026-06-12 23:14:42.089	\N	0	1
742	ACTIVE	2026-06-12 23:14:42.1	2026-06-12 23:15:02.616	20	1
743	AWAY	2026-06-12 23:15:02.616	2026-06-12 23:18:25.306	202	1
744	ACTIVE	2026-06-12 23:18:25.284	\N	0	1
745	ACTIVE	2026-06-12 23:18:25.306	2026-06-12 23:19:50.942	85	1
760	AWAY	2026-06-12 23:48:01.665	2026-06-12 23:48:11.734	10	1
746	AWAY	2026-06-12 23:19:50.942	2026-06-12 23:23:28.404	217	1
747	ACTIVE	2026-06-12 23:23:28.374	\N	0	1
748	ACTIVE	2026-06-12 23:23:28.404	2026-06-12 23:23:36.425	8	1
749	OFFLINE	2026-06-12 23:23:36.425	2026-06-12 23:24:18.85	42	1
750	ACTIVE	2026-06-12 23:24:18.85	2026-06-12 23:24:24.664	5	1
752	ACTIVE	2026-06-12 23:35:02.424	\N	0	1
761	ACTIVE	2026-06-12 23:48:11.734	2026-06-12 23:48:15.673	3	1
751	AWAY	2026-06-12 23:24:24.664	2026-06-12 23:35:02.451	637	1
754	ACTIVE	2026-06-12 23:35:02.451	2026-06-12 23:35:06.011	3	1
755	AWAY	2026-06-12 23:35:06.011	2026-06-12 23:37:35.211	149	1
762	AWAY	2026-06-12 23:48:15.673	2026-06-12 23:48:23.678	8	1
763	ACTIVE	2026-06-12 23:48:23.678	2026-06-12 23:49:23.875	60	1
764	AWAY	2026-06-12 23:49:23.875	2026-06-12 23:52:41.249	197	1
765	ACTIVE	2026-06-12 23:52:41.249	2026-06-12 23:52:42.564	1	1
766	AWAY	2026-06-12 23:52:42.564	2026-06-13 00:12:57.343	1214	1
767	ACTIVE	2026-06-13 00:12:57.343	2026-06-13 00:14:48.222	110	1
768	AWAY	2026-06-13 00:14:48.222	2026-06-13 00:14:49.101	0	1
769	ACTIVE	2026-06-13 00:14:49.101	2026-06-13 00:14:56.269	7	1
793	OFFLINE	2026-06-13 01:02:53.836	2026-06-13 01:02:54.513	0	5
771	ACTIVE	2026-06-13 00:16:23.725	\N	0	1
770	AWAY	2026-06-13 00:14:56.269	2026-06-13 00:16:23.741	87	1
753	ACTIVE	2026-06-12 23:35:02.446	2026-06-13 00:16:23.75	2481	1
773	ACTIVE	2026-06-13 00:16:23.75	2026-06-13 00:16:25.299	1	1
729	ACTIVE	2026-06-12 23:00:34.164	2026-06-13 00:21:21.593	4847	4
782	AWAY	2026-06-13 00:51:13.418	2026-06-13 00:51:13.665	0	4
775	AWAY	2026-06-13 00:21:21.593	2026-06-13 00:22:18.275	56	4
776	ACTIVE	2026-06-13 00:22:18.248	\N	0	4
774	AWAY	2026-06-13 00:16:25.299	2026-06-13 00:24:53.422	508	1
778	ACTIVE	2026-06-13 00:24:53.422	2026-06-13 00:29:55.292	301	1
779	AWAY	2026-06-13 00:29:55.292	2026-06-13 00:48:26.565	1111	1
783	ACTIVE	2026-06-13 00:51:13.653	\N	0	4
777	ACTIVE	2026-06-13 00:22:18.275	2026-06-13 00:51:13.418	1735	4
781	AWAY	2026-06-13 00:51:13.397	\N	0	4
784	ACTIVE	2026-06-13 00:51:13.665	2026-06-13 00:51:18.813	5	4
785	AWAY	2026-06-13 00:51:18.813	2026-06-13 00:51:47.276	28	4
786	ACTIVE	2026-06-13 00:51:47.276	2026-06-13 00:58:50.08	422	4
787	AWAY	2026-06-13 00:58:50.08	2026-06-13 00:58:50.267	0	4
780	OFFLINE	2026-06-13 00:48:26.565	2026-06-13 01:00:49.367	742	1
789	ACTIVE	2026-06-13 01:00:49.367	2026-06-13 01:00:57.764	8	1
788	ACTIVE	2026-06-13 00:58:50.267	2026-06-13 01:01:01.185	130	4
792	ACTIVE	2026-06-13 01:02:48.553	2026-06-13 01:02:53.836	5	5
794	ACTIVE	2026-06-13 01:02:54.513	2026-06-13 01:02:58.65	4	5
795	AWAY	2026-06-13 01:02:58.65	2026-06-13 01:03:03.22	4	5
796	OFFLINE	2026-06-13 01:03:03.22	2026-06-13 01:03:06.442	3	5
791	AWAY	2026-06-13 01:01:01.185	2026-06-13 01:03:31.107	149	4
798	ACTIVE	2026-06-13 01:03:31.107	2026-06-13 01:03:33.441	2	4
797	ACTIVE	2026-06-13 01:03:06.442	2026-06-13 01:03:39.895	33	5
799	AWAY	2026-06-13 01:03:33.441	2026-06-13 01:03:37.626	4	4
800	ACTIVE	2026-06-13 01:03:37.597	\N	0	4
802	OFFLINE	2026-06-13 01:03:39.895	2026-06-13 01:03:41.098	1	5
803	ACTIVE	2026-06-13 01:03:41.098	2026-06-13 01:03:43.279	2	5
804	OFFLINE	2026-06-13 01:03:43.279	2026-06-13 01:03:45.842	2	5
805	ACTIVE	2026-06-13 01:03:45.842	2026-06-13 01:03:51.053	5	5
806	AWAY	2026-06-13 01:03:51.053	2026-06-13 01:04:07.922	16	5
807	ACTIVE	2026-06-13 01:04:07.922	2026-06-13 01:05:29.662	81	5
808	AWAY	2026-06-13 01:05:29.662	2026-06-13 01:05:34.407	4	5
801	ACTIVE	2026-06-13 01:03:37.626	2026-06-13 01:05:57.333	139	4
811	OFFLINE	2026-06-13 01:05:57.355	\N	0	3
810	AWAY	2026-06-13 01:05:57.333	2026-06-13 01:05:57.787	0	4
814	AWAY	2026-06-13 01:06:03.053	2026-06-13 01:07:15.745	72	4
827	ACTIVE	2026-06-13 01:29:27.936	\N	0	5
812	ACTIVE	2026-06-13 01:05:57.787	2026-06-13 01:05:57.833	0	4
813	ACTIVE	2026-06-13 01:05:57.833	2026-06-13 01:06:03.053	5	4
818	ACTIVE	2026-06-13 01:07:15.745	2026-06-13 01:22:57.837	942	4
824	ACTIVE	2026-06-13 01:27:36.71	2026-06-13 01:28:46.843	70	4
772	ACTIVE	2026-06-13 00:16:23.741	2026-06-13 02:03:24.682	6420	1
845	OFFLINE	2026-06-13 02:03:24.682	2026-06-13 02:04:54.276	89	1
790	OFFLINE	2026-06-13 01:00:57.764	2026-06-13 01:06:07.593	309	1
815	ACTIVE	2026-06-13 01:06:07.593	2026-06-13 01:06:12.729	5	1
822	ACTIVE	2026-06-13 01:23:49.305	2026-06-13 01:27:04.226	194	4
826	ACTIVE	2026-06-13 01:29:27.867	\N	0	5
809	OFFLINE	2026-06-13 01:05:34.407	2026-06-13 01:29:27.938	1433	5
836	ACTIVE	2026-06-13 01:46:26.609	2026-06-13 01:46:33.911	7	4
837	AWAY	2026-06-13 01:46:33.911	2026-06-13 01:48:33.537	119	4
816	AWAY	2026-06-13 01:06:12.729	2026-06-13 01:06:14.988	2	1
817	ACTIVE	2026-06-13 01:06:14.988	2026-06-13 01:08:04.245	109	1
819	AWAY	2026-06-13 01:08:04.245	2026-06-13 01:08:09.19	4	1
820	OFFLINE	2026-06-13 01:08:09.19	2026-06-13 01:31:09.623	1380	1
838	ACTIVE	2026-06-13 01:48:33.509	\N	0	4
843	ACTIVE	2026-06-13 02:03:00.998	2026-06-13 02:03:24.659	23	1
821	AWAY	2026-06-13 01:22:57.837	2026-06-13 01:23:49.305	51	4
825	AWAY	2026-06-13 01:28:46.843	2026-06-13 01:30:37.604	110	4
823	AWAY	2026-06-13 01:27:04.226	2026-06-13 01:27:36.71	32	4
847	AWAY	2026-06-13 02:04:59.39	2026-06-13 02:12:23.491	444	1
830	ACTIVE	2026-06-13 01:31:09.623	2026-06-13 01:31:14.425	4	1
828	ACTIVE	2026-06-13 01:29:27.938	2026-06-13 01:31:17.655	109	5
829	ACTIVE	2026-06-13 01:30:37.604	2026-06-13 01:37:37.782	420	4
839	ACTIVE	2026-06-13 01:48:33.537	2026-06-13 01:48:37.157	3	4
842	ACTIVE	2026-06-13 01:48:40.386	2026-06-13 02:05:44.24	1023	4
831	AWAY	2026-06-13 01:31:14.425	2026-06-13 01:31:18.285	3	1
834	OFFLINE	2026-06-13 01:31:22.518	2026-06-13 02:38:07.895	4005	5
832	AWAY	2026-06-13 01:31:17.655	2026-06-13 01:31:22.518	4	5
835	AWAY	2026-06-13 01:37:37.782	2026-06-13 01:46:26.609	528	4
895	ACTIVE	2026-06-13 02:38:14.364	2026-06-13 02:41:15.861	181	4
840	AWAY	2026-06-13 01:48:37.157	2026-06-13 01:48:40.386	3	4
841	ACTIVE	2026-06-13 01:48:40.378	\N	0	4
833	OFFLINE	2026-06-13 01:31:18.285	2026-06-13 02:03:00.998	1902	1
844	AWAY	2026-06-13 02:03:24.659	\N	0	1
846	ACTIVE	2026-06-13 02:04:54.276	2026-06-13 02:04:59.39	5	1
848	AWAY	2026-06-13 02:05:44.24	2026-06-13 02:11:06.093	321	4
850	ACTIVE	2026-06-13 02:11:06.093	\N	0	4
849	ACTIVE	2026-06-13 02:11:06.094	2026-06-13 02:11:06.14	0	4
851	ACTIVE	2026-06-13 02:11:06.14	2026-06-13 02:11:11.135	4	4
852	AWAY	2026-06-13 02:11:11.135	2026-06-13 02:11:22.036	10	4
854	ACTIVE	2026-06-13 02:12:23.491	2026-06-13 02:12:24.617	1	1
926	ACTIVE	2026-06-13 03:08:42.291	2026-06-13 03:09:29.347	47	1
856	ACTIVE	2026-06-13 02:12:49.347	\N	0	1
855	AWAY	2026-06-13 02:12:24.617	2026-06-13 02:12:49.36	24	1
902	ACTIVE	2026-06-13 02:41:19.365	\N	0	4
858	AWAY	2026-06-13 02:13:07.762	\N	0	1
857	ACTIVE	2026-06-13 02:12:49.36	2026-06-13 02:13:07.775	18	1
859	OFFLINE	2026-06-13 02:13:07.775	2026-06-13 02:13:09.333	1	1
860	ACTIVE	2026-06-13 02:13:09.333	2026-06-13 02:13:14.053	4	1
861	AWAY	2026-06-13 02:13:14.053	2026-06-13 02:13:21.45	7	1
862	ACTIVE	2026-06-13 02:13:21.45	2026-06-13 02:13:53.45	32	1
901	AWAY	2026-06-13 02:41:15.861	2026-06-13 02:41:19.389	3	4
863	AWAY	2026-06-13 02:13:53.45	2026-06-13 02:14:39.694	46	1
865	ACTIVE	2026-06-13 02:14:39.694	2026-06-13 02:14:43.366	3	1
866	AWAY	2026-06-13 02:14:43.366	\N	0	1
864	ACTIVE	2026-06-13 02:14:39.677	2026-06-13 02:14:43.412	3	1
853	ACTIVE	2026-06-13 02:11:22.036	2026-06-13 02:21:12.706	590	4
868	AWAY	2026-06-13 02:21:12.706	2026-06-13 02:21:14.796	2	4
869	ACTIVE	2026-06-13 02:21:14.796	2026-06-13 02:21:16.024	1	4
867	OFFLINE	2026-06-13 02:14:43.412	2026-06-13 02:23:42.66	539	1
871	ACTIVE	2026-06-13 02:23:42.66	2026-06-13 02:23:42.715	0	1
872	OFFLINE	2026-06-13 02:23:42.715	2026-06-13 02:23:44.437	1	1
873	ACTIVE	2026-06-13 02:23:44.437	2026-06-13 02:23:47.719	3	1
874	AWAY	2026-06-13 02:23:47.719	2026-06-13 02:24:25.256	37	1
875	ACTIVE	2026-06-13 02:24:25.219	\N	0	1
876	ACTIVE	2026-06-13 02:24:25.256	2026-06-13 02:25:05.628	40	1
903	ACTIVE	2026-06-13 02:41:19.389	2026-06-13 02:41:30.622	11	4
877	AWAY	2026-06-13 02:25:05.628	2026-06-13 02:25:11.068	5	1
879	ACTIVE	2026-06-13 02:25:11.068	\N	0	1
878	ACTIVE	2026-06-13 02:25:11.076	2026-06-13 02:25:19.307	8	1
881	ACTIVE	2026-06-13 02:25:23.608	\N	0	1
880	AWAY	2026-06-13 02:25:19.307	2026-06-13 02:25:23.624	4	1
882	ACTIVE	2026-06-13 02:25:23.624	2026-06-13 02:25:30.519	6	1
883	AWAY	2026-06-13 02:25:30.519	2026-06-13 02:25:54.433	23	1
884	ACTIVE	2026-06-13 02:25:54.423	\N	0	1
885	ACTIVE	2026-06-13 02:25:54.433	2026-06-13 02:26:01.425	6	1
904	AWAY	2026-06-13 02:41:30.622	2026-06-13 02:41:32.789	2	4
886	AWAY	2026-06-13 02:26:01.425	2026-06-13 02:26:34.488	33	1
887	ACTIVE	2026-06-13 02:26:34.475	\N	0	1
888	ACTIVE	2026-06-13 02:26:34.488	2026-06-13 02:26:43.361	8	1
905	ACTIVE	2026-06-13 02:41:32.773	\N	0	4
890	ACTIVE	2026-06-13 02:26:51.649	\N	0	1
889	AWAY	2026-06-13 02:26:43.361	2026-06-13 02:26:51.671	8	1
891	ACTIVE	2026-06-13 02:26:51.671	2026-06-13 02:27:11.141	19	1
893	ACTIVE	2026-06-13 02:38:07.895	2026-06-13 02:38:13.418	5	5
870	AWAY	2026-06-13 02:21:16.024	2026-06-13 02:38:14.364	1018	4
894	AWAY	2026-06-13 02:38:13.418	2026-06-13 02:38:29.227	15	5
896	ACTIVE	2026-06-13 02:38:29.227	2026-06-13 02:40:22.087	112	5
897	AWAY	2026-06-13 02:40:22.087	2026-06-13 02:40:26.973	4	5
898	OFFLINE	2026-06-13 02:40:26.973	2026-06-13 02:40:37.233	10	5
899	ACTIVE	2026-06-13 02:40:37.233	2026-06-13 02:40:40.724	3	5
906	ACTIVE	2026-06-13 02:41:32.789	2026-06-13 02:42:04.427	31	4
918	OFFLINE	2026-06-13 02:51:03.295	2026-06-13 03:21:18.791	1815	5
907	AWAY	2026-06-13 02:42:04.427	2026-06-13 02:42:19.132	14	4
908	ACTIVE	2026-06-13 02:42:19.114	\N	0	4
909	ACTIVE	2026-06-13 02:42:19.132	2026-06-13 02:46:39.182	260	4
910	AWAY	2026-06-13 02:46:39.182	2026-06-13 02:46:56.609	17	4
912	ACTIVE	2026-06-13 02:46:56.609	\N	0	4
911	ACTIVE	2026-06-13 02:46:56.612	2026-06-13 02:48:11.137	74	4
928	ACTIVE	2026-06-13 03:21:18.791	2026-06-13 03:21:24.108	5	5
913	AWAY	2026-06-13 02:48:11.137	2026-06-13 02:49:33.528	82	4
915	ACTIVE	2026-06-13 02:49:33.528	\N	0	4
900	OFFLINE	2026-06-13 02:40:40.724	2026-06-13 02:50:46.205	605	5
916	ACTIVE	2026-06-13 02:50:46.205	2026-06-13 02:50:57.302	11	5
917	AWAY	2026-06-13 02:50:57.302	2026-06-13 02:51:03.295	5	5
914	ACTIVE	2026-06-13 02:49:33.534	2026-06-13 02:53:10.21	216	4
919	AWAY	2026-06-13 02:53:10.21	2026-06-13 03:03:44.092	633	4
920	ACTIVE	2026-06-13 03:03:44.092	2026-06-13 03:06:33.825	169	4
921	AWAY	2026-06-13 03:06:33.825	2026-06-13 03:08:13.381	99	4
923	ACTIVE	2026-06-13 03:08:13.381	\N	0	4
892	AWAY	2026-06-13 02:27:11.141	2026-06-13 03:08:30.527	2479	1
924	ACTIVE	2026-06-13 03:08:30.527	2026-06-13 03:08:35.687	5	1
925	AWAY	2026-06-13 03:08:35.687	2026-06-13 03:08:42.291	6	1
929	AWAY	2026-06-13 03:21:24.108	2026-06-13 03:21:40.607	16	5
930	ACTIVE	2026-06-13 03:21:40.607	2026-06-13 03:21:46.023	5	5
931	AWAY	2026-06-13 03:21:46.023	2026-06-13 03:21:52.555	6	5
932	OFFLINE	2026-06-13 03:21:52.555	2026-06-13 03:22:27.353	34	5
933	ACTIVE	2026-06-13 03:22:27.353	2026-06-13 03:22:27.59	0	5
934	OFFLINE	2026-06-13 03:22:27.59	\N	0	5
927	AWAY	2026-06-13 03:09:29.347	2026-06-13 03:23:13.984	824	1
935	ACTIVE	2026-06-13 03:23:13.984	2026-06-13 03:24:10.943	56	1
942	ACTIVE	2026-06-13 03:30:28.799	2026-06-13 03:30:33.633	4	4
936	AWAY	2026-06-13 03:24:10.943	2026-06-13 03:24:15.973	5	1
938	ACTIVE	2026-06-13 03:24:15.973	2026-06-13 03:24:35.73	19	1
922	ACTIVE	2026-06-13 03:08:13.384	2026-06-13 03:30:07.379	1313	4
940	OFFLINE	2026-06-13 03:30:07.379	2026-06-13 03:30:28.799	21	4
941	ACTIVE	2026-06-13 03:30:28.781	\N	0	4
943	AWAY	2026-06-13 03:30:33.633	2026-06-13 03:30:33.686	0	4
944	OFFLINE	2026-06-13 03:30:33.686	\N	0	4
939	AWAY	2026-06-13 03:24:35.73	2026-06-13 03:37:16.705	760	1
945	OFFLINE	2026-06-13 03:37:16.705	2026-06-13 03:40:44.346	207	1
946	ACTIVE	2026-06-13 03:40:44.346	2026-06-13 03:40:49.498	5	1
947	AWAY	2026-06-13 03:40:49.498	2026-06-13 03:40:54.554	5	1
948	ACTIVE	2026-06-13 03:40:54.554	2026-06-13 03:42:56.434	121	1
949	AWAY	2026-06-13 03:42:56.434	2026-06-13 03:43:01.043	4	1
950	OFFLINE	2026-06-13 03:43:01.043	2026-06-13 03:43:10.252	9	1
951	ACTIVE	2026-06-13 03:43:10.252	2026-06-13 03:45:54.563	164	1
952	AWAY	2026-06-13 03:45:54.563	\N	0	1
937	ACTIVE	2026-06-13 03:24:15.929	2026-06-13 03:45:54.605	1298	1
953	OFFLINE	2026-06-13 03:45:54.605	2026-06-13 03:45:55.034	0	1
954	ACTIVE	2026-06-13 03:45:55.034	2026-06-13 03:46:00.495	5	1
955	AWAY	2026-06-13 03:46:00.495	2026-06-13 03:46:12.234	11	1
956	ACTIVE	2026-06-13 03:46:12.234	2026-06-13 03:46:20.332	8	1
958	ACTIVE	2026-06-13 03:47:00.479	\N	0	1
957	AWAY	2026-06-13 03:46:20.332	2026-06-13 03:47:00.628	40	1
959	ACTIVE	2026-06-13 03:47:00.628	2026-06-13 03:53:01.735	361	1
970	AWAY	2026-06-13 03:58:57.007	\N	0	1
960	AWAY	2026-06-13 03:53:01.692	\N	0	1
966	AWAY	2026-06-13 03:55:10.636	2026-06-13 03:55:12.923	2	1
962	ACTIVE	2026-06-13 03:53:02.583	\N	0	1
961	OFFLINE	2026-06-13 03:53:01.735	2026-06-13 03:53:02.801	1	1
964	AWAY	2026-06-13 03:53:07.373	2026-06-13 03:53:10.15	2	1
965	ACTIVE	2026-06-13 03:53:10.15	2026-06-13 03:55:10.636	120	1
963	ACTIVE	2026-06-13 03:53:02.801	2026-06-13 03:53:07.373	4	1
967	ACTIVE	2026-06-13 03:55:12.923	2026-06-13 03:55:18.257	5	1
968	AWAY	2026-06-13 03:55:18.257	2026-06-13 03:55:20.725	2	1
969	ACTIVE	2026-06-13 03:55:20.725	2026-06-13 03:58:57.01	216	1
972	ACTIVE	2026-06-13 03:59:13.609	\N	0	1
973	ACTIVE	2026-06-13 03:59:13.591	\N	0	1
971	AWAY	2026-06-13 03:58:57.01	2026-06-13 03:59:13.71	16	1
975	ACTIVE	2026-06-13 03:59:13.71	2026-06-13 04:03:29.669	255	1
976	AWAY	2026-06-13 04:03:29.669	2026-06-13 04:03:30.407	0	1
977	ACTIVE	2026-06-13 04:03:30.407	\N	0	1
974	ACTIVE	2026-06-13 03:59:13.624	2026-06-13 04:03:30.518	256	1
984	ACTIVE	2026-06-13 04:30:30.166	2026-06-13 04:33:26.834	176	1
985	AWAY	2026-06-13 04:33:26.834	2026-06-13 04:33:31.075	4	1
978	ACTIVE	2026-06-13 04:03:30.518	2026-06-13 04:03:35.561	5	1
979	AWAY	2026-06-13 04:03:35.561	2026-06-13 04:06:56.202	200	1
980	ACTIVE	2026-06-13 04:06:56.202	2026-06-13 04:17:53.083	656	1
981	AWAY	2026-06-13 04:17:53.072	\N	0	1
982	AWAY	2026-06-13 04:17:53.083	2026-06-13 04:30:30.166	757	1
983	ACTIVE	2026-06-13 04:30:30.098	\N	0	1
986	OFFLINE	2026-06-13 04:33:31.075	2026-06-13 04:33:31.618	0	1
987	ACTIVE	2026-06-13 04:33:31.618	2026-06-13 04:33:37.077	5	1
988	AWAY	2026-06-13 04:33:37.077	2026-06-13 04:33:41.107	4	1
989	ACTIVE	2026-06-13 04:33:41.107	2026-06-13 04:33:44.727	3	1
990	AWAY	2026-06-13 04:33:44.727	\N	0	1
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, name, "placeOfBirth", "dateOfBirth", gender, address, religion, "maritalStatus", "jobTitle", nationality, "joinedAt", email, phone, username, password, pin, rfid, "fingerprintData", "securityMode", status, "isVerified", "baseShift", "socketId", "lastSeen", "assignedTableIds", "currentActivePage", "createdAt", "updatedAt", "roleId") FROM stdin;
5	SUPER	\N	\N	\N	\N	\N	\N	\N	\N	\N	scuff@gmail.com		scuff	$2b$10$DyTwIiX1gtH/i2bclCHgneZ.R0qFERlP02/JFVKvgB9mSvbuhZtPG	000000	\N		HYBRID	OFFLINE	t		alBhCFNcKTonSqe5AAGx	2026-06-13 03:22:27.59	[{"type":"BILLIARD","id":1},{"type":"BILLIARD","id":2},{"type":"BILLIARD","id":3},{"type":"BILLIARD","id":4},{"type":"BILLIARD","id":5},{"type":"BILLIARD","id":6},{"type":"BILLIARD","id":7},{"type":"BILLIARD","id":8},{"type":"BILLIARD","id":9},{"type":"BILLIARD","id":10},{"type":"BILLIARD","id":11},{"type":"BILLIARD","id":12},{"type":"CAFE","id":1},{"type":"CAFE","id":2},{"type":"CAFE","id":3},{"type":"CAFE","id":4},{"type":"CAFE","id":5},{"type":"CAFE","id":6},{"type":"CAFE","id":7},{"type":"CAFE","id":8},{"type":"CAFE","id":9},{"type":"CAFE","id":10},{"type":"CAFE","id":11},{"type":"CAFE","id":12}]	/admin/settings/tables	2026-06-12 03:34:35.056667	2026-06-13 03:22:27.611842	4
3	Kasir 1	\N	\N	\N	\N	\N	\N	\N	\N	\N	kasir@gmail.com		kasir1	$2b$10$Ss8gA73Bza4ZLpknnDNoaOf/3Lk5kUl37GnRv3ZJSJcRZjvJgKHii	\N	\N		HYBRID	OFFLINE	t	SHIFT 1	sYfAc07hx8XclvfTAACt	2026-06-13 01:05:57.355	[{"type":"BILLIARD","id":1},{"type":"BILLIARD","id":2},{"type":"BILLIARD","id":3},{"type":"BILLIARD","id":4},{"type":"BILLIARD","id":5},{"type":"BILLIARD","id":6},{"type":"BILLIARD","id":7},{"type":"BILLIARD","id":8},{"type":"BILLIARD","id":9},{"type":"BILLIARD","id":10},{"type":"BILLIARD","id":11},{"type":"BILLIARD","id":12},{"type":"CAFE","id":1},{"type":"CAFE","id":2},{"type":"CAFE","id":3},{"type":"CAFE","id":4},{"type":"CAFE","id":5},{"type":"CAFE","id":6},{"type":"CAFE","id":7},{"type":"CAFE","id":8},{"type":"CAFE","id":9},{"type":"CAFE","id":10},{"type":"CAFE","id":11},{"type":"CAFE","id":12}]	/	2026-06-12 03:24:02.183948	2026-06-13 01:05:57.393977	3
1	Teknisi	\N	\N	\N	\N	\N	\N	\N	\N	\N	admin@voc-billiard.com		0	$2b$10$8u3/dVNhrUiSpONBY3muDuWdfvLSvPWjX0IEw4MRY3kONez34sg3.	\N	\N		HYBRID	AWAY	t		n8kpPBnCY8Vn10TwAAAW	2026-06-13 04:33:44.727	\N	/	2026-06-12 02:32:03.159757	2026-06-13 04:33:44.844811	1
2	TIWI	\N	\N	\N	\N	\N	\N	\N	\N	\N	tiwi@gmail.com		tiwi	$2b$10$/mqL1NTeUWr2JS1Nw/v/QOS9LRL1.iu188BmryNSY.RZyproBllpa	\N	\N		HYBRID	OFFLINE	t	OVERTIME	\N	\N	\N	\N	2026-06-12 03:20:29.407189	2026-06-12 03:20:29.407189	2
4	Kasir 2	\N	\N	\N	\N	\N	\N	\N	\N	\N	kasir2@gmail.com		kasir2	$2b$10$Km.FNMY0BUrQjNwvbHoSa.Dqj/ViQEuHbhTKvAhArjOWIzrq155bO	\N	\N		HYBRID	OFFLINE	t	SHIFT 2	pxPTuZ9k3Za-5DpHAAGJ	2026-06-13 03:30:33.686	[{"type":"BILLIARD","id":1},{"type":"BILLIARD","id":2},{"type":"BILLIARD","id":3},{"type":"BILLIARD","id":4},{"type":"BILLIARD","id":5},{"type":"BILLIARD","id":6},{"type":"BILLIARD","id":7},{"type":"BILLIARD","id":8},{"type":"BILLIARD","id":9},{"type":"BILLIARD","id":10},{"type":"BILLIARD","id":11},{"type":"BILLIARD","id":12},{"type":"CAFE","id":1},{"type":"CAFE","id":2},{"type":"CAFE","id":3},{"type":"CAFE","id":4},{"type":"CAFE","id":5},{"type":"CAFE","id":6},{"type":"CAFE","id":7},{"type":"CAFE","id":8},{"type":"CAFE","id":9},{"type":"CAFE","id":10},{"type":"CAFE","id":11},{"type":"CAFE","id":12}]	/	2026-06-12 03:27:05.220298	2026-06-13 03:30:33.707406	3
\.


--
-- Data for Name: violations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.violations (id, "userId", type, description, "penaltyAmount", "durationMinutes", "shiftId", "businessDayId", "payrollReleaseId", "createdAt") FROM stdin;
1	1	IDLE_TIMEOUT	Meninggalkan sistem selama 5 menit (termasuk waktu offline pada shift aktif).	0.00	\N	\N	1	\N	2026-06-12 04:25:37.072742
2	5	IDLE_TIMEOUT	Meninggalkan sistem selama 14 menit (termasuk waktu offline pada shift aktif).	0.00	\N	\N	1	\N	2026-06-12 04:30:34.608392
3	5	IDLE_TIMEOUT	Meninggalkan sistem selama 5 menit (termasuk waktu offline pada shift aktif).	0.00	\N	\N	1	\N	2026-06-12 04:41:37.675596
4	5	IDLE_TIMEOUT	Meninggalkan sistem selama 5 menit (termasuk waktu offline pada shift aktif).	0.00	\N	\N	1	\N	2026-06-12 04:41:37.708775
5	1	IDLE_TIMEOUT	Meninggalkan sistem selama 5 menit (termasuk waktu offline pada shift aktif).	0.00	\N	\N	1	\N	2026-06-12 04:46:04.969616
6	3	IDLE_TIMEOUT	Meninggalkan sistem selama 11 menit (termasuk waktu offline pada shift aktif).	0.00	\N	\N	1	\N	2026-06-12 09:43:00.749096
7	3	IDLE_TIMEOUT	Meninggalkan sistem selama 8 menit (termasuk waktu offline pada shift aktif).	0.00	\N	1	1	\N	2026-06-12 10:31:45.767766
8	3	IDLE_TIMEOUT	Meninggalkan sistem selama 19 menit (termasuk waktu offline pada shift aktif).	0.00	\N	1	1	\N	2026-06-12 10:56:20.808206
9	3	IDLE_TIMEOUT	Meninggalkan sistem selama 5 menit (termasuk waktu offline pada shift aktif).	0.00	\N	1	1	\N	2026-06-12 11:15:01.978795
10	3	IDLE_TIMEOUT	Meninggalkan sistem selama 7 menit (termasuk waktu offline pada shift aktif).	0.00	\N	1	1	\N	2026-06-12 11:47:35.015615
11	3	IDLE_TIMEOUT	Meninggalkan sistem selama 19 menit (termasuk waktu offline pada shift aktif).	0.00	\N	1	1	\N	2026-06-12 13:21:46.968633
12	1	IDLE_TIMEOUT	Meninggalkan sistem selama 39 menit (termasuk waktu offline pada shift aktif).	0.00	\N	1	1	\N	2026-06-12 14:02:30.231842
13	3	IDLE_TIMEOUT	Meninggalkan sistem selama 14 menit (termasuk waktu offline pada shift aktif).	0.00	\N	1	1	\N	2026-06-12 14:52:11.123879
14	3	IDLE_TIMEOUT	Meninggalkan sistem selama 16 menit (termasuk waktu offline pada shift aktif).	0.00	\N	1	1	\N	2026-06-12 15:17:34.13952
15	3	IDLE_TIMEOUT	Meninggalkan sistem selama 14 menit (termasuk waktu offline pada shift aktif).	0.00	\N	1	1	\N	2026-06-12 15:33:31.090296
16	3	IDLE_TIMEOUT	Meninggalkan sistem selama 14 menit (termasuk waktu offline pada shift aktif).	0.00	\N	1	1	\N	2026-06-12 15:33:31.156181
17	4	IDLE_TIMEOUT	Meninggalkan sistem selama 23 menit (termasuk waktu offline pada shift aktif).	0.00	\N	2	1	\N	2026-06-12 17:32:45.133658
18	4	IDLE_TIMEOUT	Meninggalkan sistem selama 23 menit (termasuk waktu offline pada shift aktif).	0.00	\N	2	1	\N	2026-06-12 17:32:45.173511
19	4	IDLE_TIMEOUT	Meninggalkan sistem selama 36 menit (termasuk waktu offline pada shift aktif).	0.00	\N	2	1	\N	2026-06-12 18:33:54.424911
20	4	IDLE_TIMEOUT	Meninggalkan sistem selama 17 menit (termasuk waktu offline pada shift aktif).	0.00	\N	2	1	\N	2026-06-12 18:51:47.936747
21	4	IDLE_TIMEOUT	Meninggalkan sistem selama 6 menit (termasuk waktu offline pada shift aktif).	0.00	\N	2	1	\N	2026-06-12 19:10:55.7653
22	1	IDLE_TIMEOUT	Meninggalkan sistem selama 8 menit (termasuk waktu offline pada shift aktif).	0.00	\N	2	1	\N	2026-06-12 21:08:38.165024
23	1	IDLE_TIMEOUT	Meninggalkan sistem selama 65 menit (termasuk waktu offline pada shift aktif).	0.00	\N	2	1	\N	2026-06-12 22:14:01.012493
24	1	IDLE_TIMEOUT	Meninggalkan sistem selama 22 menit (termasuk waktu offline pada shift aktif).	0.00	\N	2	1	\N	2026-06-12 22:50:25.008344
25	1	IDLE_TIMEOUT	Meninggalkan sistem selama 10 menit (termasuk waktu offline pada shift aktif).	0.00	\N	2	1	\N	2026-06-12 23:35:02.359547
26	1	IDLE_TIMEOUT	Meninggalkan sistem selama 9 menit (termasuk waktu offline pada shift aktif).	0.00	\N	2	1	\N	2026-06-12 23:47:56.006079
27	1	IDLE_TIMEOUT	Meninggalkan sistem selama 20 menit (termasuk waktu offline pada shift aktif).	0.00	\N	2	1	\N	2026-06-13 00:12:57.283724
28	1	IDLE_TIMEOUT	Meninggalkan sistem selama 8 menit (termasuk waktu offline pada shift aktif).	0.00	\N	2	1	\N	2026-06-13 00:24:53.423926
29	4	IDLE_TIMEOUT	Meninggalkan sistem selama 7 menit (termasuk waktu offline pada shift aktif).	0.00	\N	2	1	\N	2026-06-13 00:58:50.122166
30	4	IDLE_TIMEOUT	Meninggalkan sistem selama 17 menit (termasuk waktu offline pada shift aktif).	0.00	\N	2	1	\N	2026-06-13 01:23:49.224349
31	4	IDLE_TIMEOUT	Meninggalkan sistem selama 8 menit (termasuk waktu offline pada shift aktif).	0.00	\N	2	1	\N	2026-06-13 01:46:26.508871
32	4	IDLE_TIMEOUT	Meninggalkan sistem selama 5 menit (termasuk waktu offline pada shift aktif).	0.00	\N	2	1	\N	2026-06-13 02:11:06.032945
33	4	IDLE_TIMEOUT	Meninggalkan sistem selama 5 menit (termasuk waktu offline pada shift aktif).	0.00	\N	2	1	\N	2026-06-13 02:11:06.029865
34	1	IDLE_TIMEOUT	Meninggalkan sistem selama 7 menit (termasuk waktu offline pada shift aktif).	0.00	\N	2	1	\N	2026-06-13 02:12:23.484603
35	4	IDLE_TIMEOUT	Meninggalkan sistem selama 10 menit (termasuk waktu offline pada shift aktif).	0.00	\N	2	1	\N	2026-06-13 02:21:14.787607
36	4	IDLE_TIMEOUT	Meninggalkan sistem selama 16 menit (termasuk waktu offline pada shift aktif).	0.00	\N	2	1	\N	2026-06-13 02:38:14.361022
37	4	IDLE_TIMEOUT	Meninggalkan sistem selama 10 menit (termasuk waktu offline pada shift aktif).	0.00	\N	2	1	\N	2026-06-13 03:03:44.090673
38	1	IDLE_TIMEOUT	Meninggalkan sistem selama 41 menit (termasuk waktu offline pada shift aktif).	0.00	\N	2	1	\N	2026-06-13 03:08:30.4338
39	1	IDLE_TIMEOUT	Meninggalkan sistem selama 14 menit (termasuk waktu offline pada shift aktif).	0.00	\N	2	1	\N	2026-06-13 03:23:13.938718
40	1	IDLE_TIMEOUT	Meninggalkan sistem selama 14 menit (termasuk waktu offline pada shift aktif).	0.00	\N	2	1	\N	2026-06-13 03:23:13.982982
41	1	IDLE_TIMEOUT	Meninggalkan sistem selama 26 menit (termasuk waktu offline pada shift aktif).	0.00	\N	\N	2	\N	2026-06-13 04:30:30.103384
42	1	IDLE_TIMEOUT	Meninggalkan sistem selama 26 menit (termasuk waktu offline pada shift aktif).	0.00	\N	\N	2	\N	2026-06-13 04:30:30.169005
\.


--
-- Data for Name: vouchers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.vouchers (id, code, name, description, type, "discountValue", "freeMenuItemId", "maxDiscountAmount", "minTransactionAmount", "usageLimit", "usageCount", "userId", "createdByUserId", "isBounceBack", "sourceTransactionId", "memberId", "validDays", "validStartTime", "validEndTime", "startDate", "endDate", "isActive", "ruleJson", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: waiting_lists; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.waiting_lists (id, type, "customerName", "phoneNumber", pax, status, "targetTableId", "targetTableName", "handledById", "handledByName", note, "createdAt", "updatedAt") FROM stdin;
1	CAFE	ade	085161972976	1	CANCELLED	\N	\N	\N	\N		2026-06-12 04:21:06.796594	2026-06-12 05:24:34.013595
\.


--
-- Name: access_requests_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.access_requests_id_seq', 1, false);


--
-- Name: ai_upsell_prompts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.ai_upsell_prompts_id_seq', 1, false);


--
-- Name: approval_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.approval_history_id_seq', 17, true);


--
-- Name: approval_requests_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.approval_requests_id_seq', 10, true);


--
-- Name: asset_categories_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.asset_categories_id_seq', 3, true);


--
-- Name: attendances_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.attendances_id_seq', 20, true);


--
-- Name: audit_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.audit_logs_id_seq', 123, true);


--
-- Name: battle_plan_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.battle_plan_items_id_seq', 14, true);


--
-- Name: battle_plans_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.battle_plans_id_seq', 1, true);


--
-- Name: billiard_packages_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.billiard_packages_id_seq', 19, true);


--
-- Name: business_closures_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.business_closures_id_seq', 1, false);


--
-- Name: business_days_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.business_days_id_seq', 2, true);


--
-- Name: cafe_tables_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.cafe_tables_id_seq', 12, true);


--
-- Name: cashflow_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.cashflow_id_seq', 36, true);


--
-- Name: categories_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.categories_id_seq', 6, true);


--
-- Name: chat_messages_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.chat_messages_id_seq', 2, true);


--
-- Name: daily_order_summaries_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.daily_order_summaries_id_seq', 1, false);


--
-- Name: employee_shift_schedules_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.employee_shift_schedules_id_seq', 1, false);


--
-- Name: expenses_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.expenses_id_seq', 1, false);


--
-- Name: ingredient_batches_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.ingredient_batches_id_seq', 1, false);


--
-- Name: ingredients_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.ingredients_id_seq', 61, true);


--
-- Name: inventory_waste_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.inventory_waste_id_seq', 1, false);


--
-- Name: locker_sessions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.locker_sessions_id_seq', 1, false);


--
-- Name: lockers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.lockers_id_seq', 1, false);


--
-- Name: member_missions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.member_missions_id_seq', 1, false);


--
-- Name: member_tiers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.member_tiers_id_seq', 1, false);


--
-- Name: members_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.members_id_seq', 1, false);


--
-- Name: menu_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.menu_items_id_seq', 12, true);


--
-- Name: missions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.missions_id_seq', 3, true);


--
-- Name: order_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.order_items_id_seq', 1, false);


--
-- Name: payroll_configs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.payroll_configs_id_seq', 5, true);


--
-- Name: payroll_releases_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.payroll_releases_id_seq', 1, false);


--
-- Name: point_ledgers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.point_ledgers_id_seq', 1, false);


--
-- Name: point_rewards_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.point_rewards_id_seq', 1, false);


--
-- Name: printers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.printers_id_seq', 1, false);


--
-- Name: product_finances_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.product_finances_id_seq', 11, true);


--
-- Name: promos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.promos_id_seq', 1, false);


--
-- Name: public_holidays_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.public_holidays_id_seq', 1, false);


--
-- Name: recipes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.recipes_id_seq', 15, true);


--
-- Name: roles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.roles_id_seq', 4, true);


--
-- Name: sessions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.sessions_id_seq', 37, true);


--
-- Name: settings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.settings_id_seq', 1, true);


--
-- Name: shift_stock_reports_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.shift_stock_reports_id_seq', 1, false);


--
-- Name: shifts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.shifts_id_seq', 2, true);


--
-- Name: stock_ins_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.stock_ins_id_seq', 1, false);


--
-- Name: stock_installment_plans_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.stock_installment_plans_id_seq', 1, false);


--
-- Name: stock_payments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.stock_payments_id_seq', 1, false);


--
-- Name: suppliers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.suppliers_id_seq', 1, false);


--
-- Name: tables_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.tables_id_seq', 12, true);


--
-- Name: transaction_payments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.transaction_payments_id_seq', 36, true);


--
-- Name: transactions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.transactions_id_seq', 36, true);


--
-- Name: user_status_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.user_status_logs_id_seq', 990, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 5, true);


--
-- Name: violations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.violations_id_seq', 42, true);


--
-- Name: vouchers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.vouchers_id_seq', 1, false);


--
-- Name: waiting_lists_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.waiting_lists_id_seq', 1, true);


--
-- Name: order_items PK_005269d8574e6fac0493715c308; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT "PK_005269d8574e6fac0493715c308" PRIMARY KEY (id);


--
-- Name: printers PK_036bb976f205339f632e2eb0642; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.printers
    ADD CONSTRAINT "PK_036bb976f205339f632e2eb0642" PRIMARY KEY (id);


--
-- Name: settings PK_0669fe20e252eb692bf4d344975; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT "PK_0669fe20e252eb692bf4d344975" PRIMARY KEY (id);


--
-- Name: stock_payments PK_0708d73a2778685179077a7abdc; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_payments
    ADD CONSTRAINT "PK_0708d73a2778685179077a7abdc" PRIMARY KEY (id);


--
-- Name: employee_shift_schedules PK_11d8135abc2a6374473a8200991; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employee_shift_schedules
    ADD CONSTRAINT "PK_11d8135abc2a6374473a8200991" PRIMARY KEY (id);


--
-- Name: audit_logs PK_1bb179d048bbc581caa3b013439; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT "PK_1bb179d048bbc581caa3b013439" PRIMARY KEY (id);


--
-- Name: categories PK_24dbc6126a28ff948da33e97d3b; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT "PK_24dbc6126a28ff948da33e97d3b" PRIMARY KEY (id);


--
-- Name: members PK_28b53062261b996d9c99fa12404; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.members
    ADD CONSTRAINT "PK_28b53062261b996d9c99fa12404" PRIMARY KEY (id);


--
-- Name: inventory_waste PK_2a9d6dfd738506c70b448709265; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_waste
    ADD CONSTRAINT "PK_2a9d6dfd738506c70b448709265" PRIMARY KEY (id);


--
-- Name: point_ledgers PK_2f4623c7ac8e76803359661f8f0; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.point_ledgers
    ADD CONSTRAINT "PK_2f4623c7ac8e76803359661f8f0" PRIMARY KEY (id);


--
-- Name: business_closures PK_3229501b194bbc7756b7608c389; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.business_closures
    ADD CONSTRAINT "PK_3229501b194bbc7756b7608c389" PRIMARY KEY (id);


--
-- Name: sessions PK_3238ef96f18b355b671619111bc; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT "PK_3238ef96f18b355b671619111bc" PRIMARY KEY (id);


--
-- Name: transaction_payments PK_324e77bea070ff5e6822f478da1; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transaction_payments
    ADD CONSTRAINT "PK_324e77bea070ff5e6822f478da1" PRIMARY KEY (id);


--
-- Name: chat_messages PK_40c55ee0e571e268b0d3cd37d10; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT "PK_40c55ee0e571e268b0d3cd37d10" PRIMARY KEY (id);


--
-- Name: attendances PK_483ed97cd4cd43ab4a117516b69; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attendances
    ADD CONSTRAINT "PK_483ed97cd4cd43ab4a117516b69" PRIMARY KEY (id);


--
-- Name: approval_requests PK_484806bb8ff331b851fc75973c0; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.approval_requests
    ADD CONSTRAINT "PK_484806bb8ff331b851fc75973c0" PRIMARY KEY (id);


--
-- Name: member_tiers PK_4c9bb099d34b07747cf9262be07; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.member_tiers
    ADD CONSTRAINT "PK_4c9bb099d34b07747cf9262be07" PRIMARY KEY (id);


--
-- Name: cashflow PK_4cb64c5ef0ef3b8bee6d04bc488; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cashflow
    ADD CONSTRAINT "PK_4cb64c5ef0ef3b8bee6d04bc488" PRIMARY KEY (id);


--
-- Name: battle_plans PK_5326478b4a914bcc238e6b351a9; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.battle_plans
    ADD CONSTRAINT "PK_5326478b4a914bcc238e6b351a9" PRIMARY KEY (id);


--
-- Name: payroll_releases PK_5381d1ab1c2f8810cf0b1d6033a; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payroll_releases
    ADD CONSTRAINT "PK_5381d1ab1c2f8810cf0b1d6033a" PRIMARY KEY (id);


--
-- Name: menu_items PK_57e6188f929e5dc6919168620c8; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.menu_items
    ADD CONSTRAINT "PK_57e6188f929e5dc6919168620c8" PRIMARY KEY (id);


--
-- Name: ai_upsell_prompts PK_581da54c98d791b287f82ea0703; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_upsell_prompts
    ADD CONSTRAINT "PK_581da54c98d791b287f82ea0703" PRIMARY KEY (id);


--
-- Name: daily_order_summaries PK_5e439109f0f389275e749eb4422; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.daily_order_summaries
    ADD CONSTRAINT "PK_5e439109f0f389275e749eb4422" PRIMARY KEY (id);


--
-- Name: lockers PK_6424129dcf95d459db621073f8a; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lockers
    ADD CONSTRAINT "PK_6424129dcf95d459db621073f8a" PRIMARY KEY (id);


--
-- Name: business_days PK_6e2b7441ef4267e61a88a1aec4f; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.business_days
    ADD CONSTRAINT "PK_6e2b7441ef4267e61a88a1aec4f" PRIMARY KEY (id);


--
-- Name: push_subscriptions PK_757fc8f00c34f66832668dc2e53; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.push_subscriptions
    ADD CONSTRAINT "PK_757fc8f00c34f66832668dc2e53" PRIMARY KEY (id);


--
-- Name: battle_plan_items PK_76b6fbc558d7d2ef61b7b16b96f; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.battle_plan_items
    ADD CONSTRAINT "PK_76b6fbc558d7d2ef61b7b16b96f" PRIMARY KEY (id);


--
-- Name: missions PK_787aebb1ac5923c9904043c6309; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.missions
    ADD CONSTRAINT "PK_787aebb1ac5923c9904043c6309" PRIMARY KEY (id);


--
-- Name: tables PK_7cf2aca7af9550742f855d4eb69; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tables
    ADD CONSTRAINT "PK_7cf2aca7af9550742f855d4eb69" PRIMARY KEY (id);


--
-- Name: shifts PK_84d692e367e4d6cdf045828768c; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shifts
    ADD CONSTRAINT "PK_84d692e367e4d6cdf045828768c" PRIMARY KEY (id);


--
-- Name: approval_history PK_8c0d98d2ebd152bc1e8f23c91af; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.approval_history
    ADD CONSTRAINT "PK_8c0d98d2ebd152bc1e8f23c91af" PRIMARY KEY (id);


--
-- Name: recipes PK_8f09680a51bf3669c1598a21682; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.recipes
    ADD CONSTRAINT "PK_8f09680a51bf3669c1598a21682" PRIMARY KEY (id);


--
-- Name: ingredients PK_9240185c8a5507251c9f15e0649; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ingredients
    ADD CONSTRAINT "PK_9240185c8a5507251c9f15e0649" PRIMARY KEY (id);


--
-- Name: expenses PK_94c3ceb17e3140abc9282c20610; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT "PK_94c3ceb17e3140abc9282c20610" PRIMARY KEY (id);


--
-- Name: locker_sessions PK_984f24d0b1f12ee391b0835d4e1; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.locker_sessions
    ADD CONSTRAINT "PK_984f24d0b1f12ee391b0835d4e1" PRIMARY KEY (id);


--
-- Name: stock_installment_plans PK_986143ddee4a0c86ee90c0a27cd; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_installment_plans
    ADD CONSTRAINT "PK_986143ddee4a0c86ee90c0a27cd" PRIMARY KEY (id);


--
-- Name: point_rewards PK_9a16df4c4e6b1c2ed5adce7610a; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.point_rewards
    ADD CONSTRAINT "PK_9a16df4c4e6b1c2ed5adce7610a" PRIMARY KEY (id);


--
-- Name: transactions PK_a219afd8dd77ed80f5a862f1db9; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT "PK_a219afd8dd77ed80f5a862f1db9" PRIMARY KEY (id);


--
-- Name: violations PK_a2aa2d655842de3c02315ba6073; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.violations
    ADD CONSTRAINT "PK_a2aa2d655842de3c02315ba6073" PRIMARY KEY (id);


--
-- Name: users PK_a3ffb1c0c8416b9fc6f907b7433; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY (id);


--
-- Name: promos PK_ac05363b0734f3842a720d20bcc; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.promos
    ADD CONSTRAINT "PK_ac05363b0734f3842a720d20bcc" PRIMARY KEY (id);


--
-- Name: suppliers PK_b70ac51766a9e3144f778cfe81e; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT "PK_b70ac51766a9e3144f778cfe81e" PRIMARY KEY (id);


--
-- Name: user_status_logs PK_b7240f8f15882f88b7ee9adb80b; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_status_logs
    ADD CONSTRAINT "PK_b7240f8f15882f88b7ee9adb80b" PRIMARY KEY (id);


--
-- Name: roles PK_c1433d71a4838793a49dcad46ab; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT "PK_c1433d71a4838793a49dcad46ab" PRIMARY KEY (id);


--
-- Name: product_finances PK_c7c35d41451c8c6798ac97e5d9c; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_finances
    ADD CONSTRAINT "PK_c7c35d41451c8c6798ac97e5d9c" PRIMARY KEY (id);


--
-- Name: cafe_tables PK_c8e44003fbe0eb94a641a7cfa35; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cafe_tables
    ADD CONSTRAINT "PK_c8e44003fbe0eb94a641a7cfa35" PRIMARY KEY (id);


--
-- Name: ingredient_batches PK_c990de48f9d8141514b51feff58; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ingredient_batches
    ADD CONSTRAINT "PK_c990de48f9d8141514b51feff58" PRIMARY KEY (id);


--
-- Name: billiard_packages PK_ca05def92b923e0898996fa3a54; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.billiard_packages
    ADD CONSTRAINT "PK_ca05def92b923e0898996fa3a54" PRIMARY KEY (id);


--
-- Name: asset_categories PK_d21442187e7b0237566389805a8; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asset_categories
    ADD CONSTRAINT "PK_d21442187e7b0237566389805a8" PRIMARY KEY (id);


--
-- Name: member_missions PK_e0a5ea022e303dffd78edf4b295; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.member_missions
    ADD CONSTRAINT "PK_e0a5ea022e303dffd78edf4b295" PRIMARY KEY (id);


--
-- Name: payroll_configs PK_e3d0c48b77970678649685cb4fa; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payroll_configs
    ADD CONSTRAINT "PK_e3d0c48b77970678649685cb4fa" PRIMARY KEY (id);


--
-- Name: public_holidays PK_e959831bb7c79c39cc58207c122; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.public_holidays
    ADD CONSTRAINT "PK_e959831bb7c79c39cc58207c122" PRIMARY KEY (id);


--
-- Name: waiting_lists PK_e97817471a452bf64c0047b16ea; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.waiting_lists
    ADD CONSTRAINT "PK_e97817471a452bf64c0047b16ea" PRIMARY KEY (id);


--
-- Name: vouchers PK_ed1b7dd909a696560763acdbc04; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vouchers
    ADD CONSTRAINT "PK_ed1b7dd909a696560763acdbc04" PRIMARY KEY (id);


--
-- Name: shift_stock_reports PK_f0ab2aec2b434d307fd74971e41; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shift_stock_reports
    ADD CONSTRAINT "PK_f0ab2aec2b434d307fd74971e41" PRIMARY KEY (id);


--
-- Name: stock_ins PK_f2777e234a5b7eb8b20ef8c37f2; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_ins
    ADD CONSTRAINT "PK_f2777e234a5b7eb8b20ef8c37f2" PRIMARY KEY (id);


--
-- Name: access_requests PK_f89e51c15e3dbea13aa248fe128; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.access_requests
    ADD CONSTRAINT "PK_f89e51c15e3dbea13aa248fe128" PRIMARY KEY (id);


--
-- Name: product_finances REL_4ef15a650502fcc3f12168fc69; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_finances
    ADD CONSTRAINT "REL_4ef15a650502fcc3f12168fc69" UNIQUE ("menuItemId");


--
-- Name: payroll_configs REL_be94d67920f2fda44a925749e4; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payroll_configs
    ADD CONSTRAINT "REL_be94d67920f2fda44a925749e4" UNIQUE ("userId");


--
-- Name: ingredients UQ_0809109177145f6350f5164329f; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ingredients
    ADD CONSTRAINT "UQ_0809109177145f6350f5164329f" UNIQUE (sku);


--
-- Name: members UQ_0b445c5cf1e0c7b00605dff79fa; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.members
    ADD CONSTRAINT "UQ_0b445c5cf1e0c7b00605dff79fa" UNIQUE ("memberCode");


--
-- Name: menu_items UQ_1bc11bdd03f1032383398bcfc64; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.menu_items
    ADD CONSTRAINT "UQ_1bc11bdd03f1032383398bcfc64" UNIQUE (sku);


--
-- Name: users UQ_4b9cc327e955d8b666da99cd0c2; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT "UQ_4b9cc327e955d8b666da99cd0c2" UNIQUE (rfid);


--
-- Name: roles UQ_648e3f5447f725579d7d4ffdfb7; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT "UQ_648e3f5447f725579d7d4ffdfb7" UNIQUE (name);


--
-- Name: menu_items UQ_69bf08c96d8fada9f36f101216e; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.menu_items
    ADD CONSTRAINT "UQ_69bf08c96d8fada9f36f101216e" UNIQUE (name);


--
-- Name: member_tiers UQ_6d174a292e721c7c5a0ac5b953f; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.member_tiers
    ADD CONSTRAINT "UQ_6d174a292e721c7c5a0ac5b953f" UNIQUE (name);


--
-- Name: asset_categories UQ_72175ada98a0852411360e3a48d; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asset_categories
    ADD CONSTRAINT "UQ_72175ada98a0852411360e3a48d" UNIQUE (name);


--
-- Name: ingredient_batches UQ_8a706ce861bc056993e428d7763; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ingredient_batches
    ADD CONSTRAINT "UQ_8a706ce861bc056993e428d7763" UNIQUE ("batchNumber");


--
-- Name: categories UQ_8b0be371d28245da6e4f4b61878; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT "UQ_8b0be371d28245da6e4f4b61878" UNIQUE (name);


--
-- Name: users UQ_97672ac88f789774dd47f7c8be3; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE (email);


--
-- Name: members UQ_a2c60ace98ce2b27b7e4b3be4ca; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.members
    ADD CONSTRAINT "UQ_a2c60ace98ce2b27b7e4b3be4ca" UNIQUE ("rfidUid");


--
-- Name: lockers UQ_a378f2e251c3c826cde80a22f3d; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lockers
    ADD CONSTRAINT "UQ_a378f2e251c3c826cde80a22f3d" UNIQUE (number);


--
-- Name: tables UQ_a7f46a89cb6b93351d032f3a4f8; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tables
    ADD CONSTRAINT "UQ_a7f46a89cb6b93351d032f3a4f8" UNIQUE ("tableName");


--
-- Name: ingredients UQ_a955029b22ff66ae9fef2e161f8; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ingredients
    ADD CONSTRAINT "UQ_a955029b22ff66ae9fef2e161f8" UNIQUE (name);


--
-- Name: transactions UQ_bac2f1282f9374ae3b6f0a5c1a4; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT "UQ_bac2f1282f9374ae3b6f0a5c1a4" UNIQUE ("invoiceNumber");


--
-- Name: cafe_tables UQ_cc6dd208f9c6f351297c5ca620d; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cafe_tables
    ADD CONSTRAINT "UQ_cc6dd208f9c6f351297c5ca620d" UNIQUE ("tableName");


--
-- Name: vouchers UQ_efc30b2b9169e05e0e1e19d6dd6; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vouchers
    ADD CONSTRAINT "UQ_efc30b2b9169e05e0e1e19d6dd6" UNIQUE (code);


--
-- Name: members UQ_f2a38e0022c6358768845addaf9; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.members
    ADD CONSTRAINT "UQ_f2a38e0022c6358768845addaf9" UNIQUE ("referralCode");


--
-- Name: users UQ_fe0bb3f6520ee0469504521e710; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT "UQ_fe0bb3f6520ee0469504521e710" UNIQUE (username);


--
-- Name: cashflow_archive cashflow_archive_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cashflow_archive
    ADD CONSTRAINT cashflow_archive_pkey PRIMARY KEY (id);


--
-- Name: order_items_archive order_items_archive_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items_archive
    ADD CONSTRAINT order_items_archive_pkey PRIMARY KEY (id);


--
-- Name: transaction_payments_archive transaction_payments_archive_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transaction_payments_archive
    ADD CONSTRAINT transaction_payments_archive_pkey PRIMARY KEY (id);


--
-- Name: transactions_archive transactions_archive_invoiceNumber_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transactions_archive
    ADD CONSTRAINT "transactions_archive_invoiceNumber_key" UNIQUE ("invoiceNumber");


--
-- Name: transactions_archive transactions_archive_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transactions_archive
    ADD CONSTRAINT transactions_archive_pkey PRIMARY KEY (id);


--
-- Name: IDX_1829c830ec4b69200ab0a4542a; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_1829c830ec4b69200ab0a4542a" ON public.ai_upsell_prompts USING btree ("businessDayId", "isConverted");


--
-- Name: IDX_19ec2807eec1da41e67a736378; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_19ec2807eec1da41e67a736378" ON public.point_ledgers USING btree ("createdAt");


--
-- Name: IDX_3602f81ec3212a0dddbb12dbb1; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "IDX_3602f81ec3212a0dddbb12dbb1" ON public.employee_shift_schedules USING btree ("userId", date);


--
-- Name: IDX_6035d44d55f4ad83bd2237cde5; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_6035d44d55f4ad83bd2237cde5" ON public.ingredient_batches USING btree (status);


--
-- Name: IDX_61d8cd1124d51b142e156526b2; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_61d8cd1124d51b142e156526b2" ON public.ingredient_batches USING btree ("createdAt");


--
-- Name: IDX_670284220e47cb165679195642; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "IDX_670284220e47cb165679195642" ON public.attendances USING btree ("userId", date);


--
-- Name: IDX_7c2260ae62a6d3c13b79ed5854; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_7c2260ae62a6d3c13b79ed5854" ON public.point_ledgers USING btree ("memberId");


--
-- Name: IDX_8991983498a74de5aa2edae24b; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_8991983498a74de5aa2edae24b" ON public.payroll_releases USING btree ("userId", month, year);


--
-- Name: IDX_9a197c82c9ea44d75bc145a6e2; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_9a197c82c9ea44d75bc145a6e2" ON public.chat_messages USING btree ("receiverId");


--
-- Name: IDX_ee152f564577691082e5159ebd; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_ee152f564577691082e5159ebd" ON public.chat_messages USING btree ("timestamp");


--
-- Name: IDX_fc6b58e41e9a871dacbe9077de; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_fc6b58e41e9a871dacbe9077de" ON public.chat_messages USING btree ("senderId");


--
-- Name: cashflow_archive_businessDayId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "cashflow_archive_businessDayId_idx" ON public.cashflow_archive USING btree ("businessDayId");


--
-- Name: cashflow_archive_shiftId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "cashflow_archive_shiftId_idx" ON public.cashflow_archive USING btree ("shiftId");


--
-- Name: cashflow_archive_timestamp_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX cashflow_archive_timestamp_idx ON public.cashflow_archive USING btree ("timestamp");


--
-- Name: cashflow_archive_type_timestamp_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX cashflow_archive_type_timestamp_idx ON public.cashflow_archive USING btree (type, "timestamp");


--
-- Name: idx_audit_logs_action; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_logs_action ON public.audit_logs USING btree (action);


--
-- Name: idx_audit_logs_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_logs_created ON public.audit_logs USING btree ("createdAt");


--
-- Name: idx_cashflow_business_day; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_cashflow_business_day ON public.cashflow USING btree ("businessDayId");


--
-- Name: idx_cashflow_shift; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_cashflow_shift ON public.cashflow USING btree ("shiftId");


--
-- Name: idx_cashflow_timestamp; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_cashflow_timestamp ON public.cashflow USING btree ("timestamp");


--
-- Name: idx_cashflow_type_timestamp; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_cashflow_type_timestamp ON public.cashflow USING btree (type, "timestamp");


--
-- Name: idx_expenses_business_day; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_expenses_business_day ON public.expenses USING btree ("businessDayId");


--
-- Name: idx_members_referred_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_members_referred_by ON public.members USING btree ("referredById");


--
-- Name: idx_members_tier; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_members_tier ON public.members USING btree ("tierId");


--
-- Name: idx_order_items_completed_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_order_items_completed_by ON public.order_items USING btree ("completedByUserId");


--
-- Name: idx_order_items_created_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_order_items_created_by ON public.order_items USING btree ("createdByUserId");


--
-- Name: idx_order_items_menu; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_order_items_menu ON public.order_items USING btree ("menuItemId");


--
-- Name: idx_order_items_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_order_items_status ON public.order_items USING btree (status);


--
-- Name: idx_order_items_transactionId; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_order_items_transactionId" ON public.order_items USING btree ("transactionId");


--
-- Name: idx_transaction_payments_transaction; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_transaction_payments_transaction ON public.transaction_payments USING btree ("transactionId");


--
-- Name: idx_transactions_business_day; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_transactions_business_day ON public.transactions USING btree ("businessDayId");


--
-- Name: idx_transactions_cafe_table; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_transactions_cafe_table ON public.transactions USING btree ("cafeTableId");


--
-- Name: idx_transactions_created_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_transactions_created_by ON public.transactions USING btree ("createdByUserId");


--
-- Name: idx_transactions_invoice; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_transactions_invoice ON public.transactions USING btree ("invoiceNumber");


--
-- Name: idx_transactions_member; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_transactions_member ON public.transactions USING btree ("memberId");


--
-- Name: idx_transactions_opened_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_transactions_opened_by ON public.transactions USING btree ("openedByUserId");


--
-- Name: idx_transactions_shift; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_transactions_shift ON public.transactions USING btree ("shiftId");


--
-- Name: idx_transactions_status_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_transactions_status_created ON public.transactions USING btree (status, "createdAt");


--
-- Name: idx_transactions_table_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_transactions_table_created ON public.transactions USING btree ("tableId", "createdAt");


--
-- Name: order_items_archive_completedByUserId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "order_items_archive_completedByUserId_idx" ON public.order_items_archive USING btree ("completedByUserId");


--
-- Name: order_items_archive_createdByUserId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "order_items_archive_createdByUserId_idx" ON public.order_items_archive USING btree ("createdByUserId");


--
-- Name: order_items_archive_menuItemId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "order_items_archive_menuItemId_idx" ON public.order_items_archive USING btree ("menuItemId");


--
-- Name: order_items_archive_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX order_items_archive_status_idx ON public.order_items_archive USING btree (status);


--
-- Name: order_items_archive_transactionId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "order_items_archive_transactionId_idx" ON public.order_items_archive USING btree ("transactionId");


--
-- Name: transaction_payments_archive_transactionId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "transaction_payments_archive_transactionId_idx" ON public.transaction_payments_archive USING btree ("transactionId");


--
-- Name: transactions_archive_businessDayId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "transactions_archive_businessDayId_idx" ON public.transactions_archive USING btree ("businessDayId");


--
-- Name: transactions_archive_cafeTableId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "transactions_archive_cafeTableId_idx" ON public.transactions_archive USING btree ("cafeTableId");


--
-- Name: transactions_archive_createdByUserId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "transactions_archive_createdByUserId_idx" ON public.transactions_archive USING btree ("createdByUserId");


--
-- Name: transactions_archive_invoiceNumber_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "transactions_archive_invoiceNumber_idx" ON public.transactions_archive USING btree ("invoiceNumber");


--
-- Name: transactions_archive_memberId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "transactions_archive_memberId_idx" ON public.transactions_archive USING btree ("memberId");


--
-- Name: transactions_archive_openedByUserId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "transactions_archive_openedByUserId_idx" ON public.transactions_archive USING btree ("openedByUserId");


--
-- Name: transactions_archive_shiftId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "transactions_archive_shiftId_idx" ON public.transactions_archive USING btree ("shiftId");


--
-- Name: transactions_archive_status_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "transactions_archive_status_createdAt_idx" ON public.transactions_archive USING btree (status, "createdAt");


--
-- Name: transactions_archive_tableId_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "transactions_archive_tableId_createdAt_idx" ON public.transactions_archive USING btree ("tableId", "createdAt");


--
-- Name: payroll_releases FK_01c9c099d46f7a8beb2003ea4ab; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payroll_releases
    ADD CONSTRAINT "FK_01c9c099d46f7a8beb2003ea4ab" FOREIGN KEY ("userId") REFERENCES public.users(id);


--
-- Name: order_items FK_03ada54a1b946193c7fda18bab2; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT "FK_03ada54a1b946193c7fda18bab2" FOREIGN KEY ("transactionId") REFERENCES public.transactions(id);


--
-- Name: vouchers FK_0492799cd14fae511b856c8984a; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vouchers
    ADD CONSTRAINT "FK_0492799cd14fae511b856c8984a" FOREIGN KEY ("userId") REFERENCES public.users(id);


--
-- Name: cashflow FK_0b5a953e750a41569cf0121ae26; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cashflow
    ADD CONSTRAINT "FK_0b5a953e750a41569cf0121ae26" FOREIGN KEY ("businessDayId") REFERENCES public.business_days(id);


--
-- Name: shift_stock_reports FK_0b7684b34007f3e03b1b1813475; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shift_stock_reports
    ADD CONSTRAINT "FK_0b7684b34007f3e03b1b1813475" FOREIGN KEY ("menuItemId") REFERENCES public.menu_items(id);


--
-- Name: tables FK_1aa192043da035d34d9bc8c0332; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tables
    ADD CONSTRAINT "FK_1aa192043da035d34d9bc8c0332" FOREIGN KEY ("categoryId") REFERENCES public.asset_categories(id) ON DELETE SET NULL;


--
-- Name: inventory_waste FK_1d25b5ec8a53a8a0b16ea0951e8; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_waste
    ADD CONSTRAINT "FK_1d25b5ec8a53a8a0b16ea0951e8" FOREIGN KEY ("ingredientId") REFERENCES public.ingredients(id);


--
-- Name: lockers FK_24603cec66ec6769baefc0c5cfd; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lockers
    ADD CONSTRAINT "FK_24603cec66ec6769baefc0c5cfd" FOREIGN KEY ("categoryId") REFERENCES public.asset_categories(id) ON DELETE SET NULL;


--
-- Name: ai_upsell_prompts FK_26767af6a29d051886dae7f73e4; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_upsell_prompts
    ADD CONSTRAINT "FK_26767af6a29d051886dae7f73e4" FOREIGN KEY ("menuItemId") REFERENCES public.menu_items(id);


--
-- Name: battle_plan_items FK_2b20c8c3dd718b1cfd88d50ab37; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.battle_plan_items
    ADD CONSTRAINT "FK_2b20c8c3dd718b1cfd88d50ab37" FOREIGN KEY ("packageId") REFERENCES public.billiard_packages(id) ON DELETE CASCADE;


--
-- Name: order_items FK_2e023ac8a7c5f09e431273f5edd; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT "FK_2e023ac8a7c5f09e431273f5edd" FOREIGN KEY ("commissionUserId") REFERENCES public.users(id);


--
-- Name: stock_ins FK_2e5cf57d6c5df32d2ec21fa6b00; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_ins
    ADD CONSTRAINT "FK_2e5cf57d6c5df32d2ec21fa6b00" FOREIGN KEY ("supplierId") REFERENCES public.suppliers(id);


--
-- Name: transactions FK_34aa3fc18ecdd334edca12997ff; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT "FK_34aa3fc18ecdd334edca12997ff" FOREIGN KEY ("memberId") REFERENCES public.members(id) ON DELETE SET NULL;


--
-- Name: users FK_368e146b785b574f42ae9e53d5e; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT "FK_368e146b785b574f42ae9e53d5e" FOREIGN KEY ("roleId") REFERENCES public.roles(id);


--
-- Name: stock_installment_plans FK_39264931388f1ac0e17f5ba60e9; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_installment_plans
    ADD CONSTRAINT "FK_39264931388f1ac0e17f5ba60e9" FOREIGN KEY ("stockInId") REFERENCES public.stock_ins(id);


--
-- Name: transactions FK_427bdbd128fd69328cb8d9cc72e; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT "FK_427bdbd128fd69328cb8d9cc72e" FOREIGN KEY ("commissionUserId") REFERENCES public.users(id);


--
-- Name: expenses FK_4594b315caee78bc6317d6fae26; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT "FK_4594b315caee78bc6317d6fae26" FOREIGN KEY ("businessDayId") REFERENCES public.business_days(id);


--
-- Name: transactions FK_45eed5e3000be564fcef99c8130; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT "FK_45eed5e3000be564fcef99c8130" FOREIGN KEY ("cafeTableId") REFERENCES public.cafe_tables(id);


--
-- Name: battle_plans FK_46c309249c3a2c6df8f701c7933; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.battle_plans
    ADD CONSTRAINT "FK_46c309249c3a2c6df8f701c7933" FOREIGN KEY ("businessDayId") REFERENCES public.business_days(id);


--
-- Name: battle_plan_items FK_475b1560b947345736254b7f71d; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.battle_plan_items
    ADD CONSTRAINT "FK_475b1560b947345736254b7f71d" FOREIGN KEY ("battlePlanId") REFERENCES public.battle_plans(id) ON DELETE CASCADE;


--
-- Name: transaction_payments FK_4c2a04b1d560a2e6b71df440657; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transaction_payments
    ADD CONSTRAINT "FK_4c2a04b1d560a2e6b71df440657" FOREIGN KEY ("businessDayId") REFERENCES public.business_days(id);


--
-- Name: push_subscriptions FK_4cc061875e9eecc311a94b3e431; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.push_subscriptions
    ADD CONSTRAINT "FK_4cc061875e9eecc311a94b3e431" FOREIGN KEY ("userId") REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: expenses FK_4dc438ad287cebf80163b0a30ce; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT "FK_4dc438ad287cebf80163b0a30ce" FOREIGN KEY ("shiftId") REFERENCES public.shifts(id);


--
-- Name: product_finances FK_4ef15a650502fcc3f12168fc69a; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_finances
    ADD CONSTRAINT "FK_4ef15a650502fcc3f12168fc69a" FOREIGN KEY ("menuItemId") REFERENCES public.menu_items(id) ON DELETE CASCADE;


--
-- Name: violations FK_4f0e91cd3e2b354dcf7b214e84d; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.violations
    ADD CONSTRAINT "FK_4f0e91cd3e2b354dcf7b214e84d" FOREIGN KEY ("shiftId") REFERENCES public.shifts(id);


--
-- Name: transaction_payments FK_510656baf0222fb813b74b577b6; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transaction_payments
    ADD CONSTRAINT "FK_510656baf0222fb813b74b577b6" FOREIGN KEY ("createdByUserId") REFERENCES public.users(id);


--
-- Name: stock_ins FK_53442f9be2817d0c56d8807dab3; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_ins
    ADD CONSTRAINT "FK_53442f9be2817d0c56d8807dab3" FOREIGN KEY ("ingredientId") REFERENCES public.ingredients(id);


--
-- Name: vouchers FK_546adbd18350d8955d3b722e4ff; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vouchers
    ADD CONSTRAINT "FK_546adbd18350d8955d3b722e4ff" FOREIGN KEY ("freeMenuItemId") REFERENCES public.menu_items(id);


--
-- Name: transactions FK_5cdbf429236c6c7788853f7d249; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT "FK_5cdbf429236c6c7788853f7d249" FOREIGN KEY ("businessDayId") REFERENCES public.business_days(id);


--
-- Name: user_status_logs FK_5d482cf90ad8f81adfdce42e8ac; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_status_logs
    ADD CONSTRAINT "FK_5d482cf90ad8f81adfdce42e8ac" FOREIGN KEY ("userId") REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: attendances FK_5e20bdbc6b72f0da23eb2ff1b60; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attendances
    ADD CONSTRAINT "FK_5e20bdbc6b72f0da23eb2ff1b60" FOREIGN KEY ("userId") REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: transactions FK_5f23a17b4bed7d2f2d3eb0f40db; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT "FK_5f23a17b4bed7d2f2d3eb0f40db" FOREIGN KEY ("shiftId") REFERENCES public.shifts(id);


--
-- Name: sessions FK_6282a4de7c5be3e5a298866bc87; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT "FK_6282a4de7c5be3e5a298866bc87" FOREIGN KEY ("memberId") REFERENCES public.members(id);


--
-- Name: recipes FK_62cb55f7b4dad1a284bf7ffc195; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.recipes
    ADD CONSTRAINT "FK_62cb55f7b4dad1a284bf7ffc195" FOREIGN KEY ("subMenuItemId") REFERENCES public.menu_items(id);


--
-- Name: inventory_waste FK_68060d40e816214cd9171bcdb4f; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_waste
    ADD CONSTRAINT "FK_68060d40e816214cd9171bcdb4f" FOREIGN KEY ("recordedByUserId") REFERENCES public.users(id);


--
-- Name: recipes FK_6a5fe40a53d3fe478bfc7a77f0b; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.recipes
    ADD CONSTRAINT "FK_6a5fe40a53d3fe478bfc7a77f0b" FOREIGN KEY ("menuItemId") REFERENCES public.menu_items(id);


--
-- Name: inventory_waste FK_6b01220141f79d41fb04cd5b87a; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_waste
    ADD CONSTRAINT "FK_6b01220141f79d41fb04cd5b87a" FOREIGN KEY ("businessDayId") REFERENCES public.business_days(id);


--
-- Name: locker_sessions FK_6b803e0550045b770b596f43c2d; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.locker_sessions
    ADD CONSTRAINT "FK_6b803e0550045b770b596f43c2d" FOREIGN KEY ("lockerId") REFERENCES public.lockers(id) ON DELETE CASCADE;


--
-- Name: approval_requests FK_6d1966b898c9e52ee4487f8cff2; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.approval_requests
    ADD CONSTRAINT "FK_6d1966b898c9e52ee4487f8cff2" FOREIGN KEY ("requestedByUserId") REFERENCES public.users(id);


--
-- Name: stock_payments FK_6f9f3a1831aca6797c1f870e12a; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_payments
    ADD CONSTRAINT "FK_6f9f3a1831aca6797c1f870e12a" FOREIGN KEY ("stockInId") REFERENCES public.stock_ins(id);


--
-- Name: transactions FK_719fbfb8f177c22ce1984a570d7; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT "FK_719fbfb8f177c22ce1984a570d7" FOREIGN KEY ("createdByUserId") REFERENCES public.users(id);


--
-- Name: battle_plan_items FK_72c1e90832e4f0f21f12ca7e46d; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.battle_plan_items
    ADD CONSTRAINT "FK_72c1e90832e4f0f21f12ca7e46d" FOREIGN KEY ("menuItemId") REFERENCES public.menu_items(id);


--
-- Name: members FK_749838686d54572e2beac4709c7; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.members
    ADD CONSTRAINT "FK_749838686d54572e2beac4709c7" FOREIGN KEY ("tierId") REFERENCES public.member_tiers(id);


--
-- Name: shifts FK_773efebc1ec712097deb65cc3e4; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shifts
    ADD CONSTRAINT "FK_773efebc1ec712097deb65cc3e4" FOREIGN KEY ("businessDayId") REFERENCES public.business_days(id);


--
-- Name: shifts FK_7862b9a401e0fe7dc5ef96e9116; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shifts
    ADD CONSTRAINT "FK_7862b9a401e0fe7dc5ef96e9116" FOREIGN KEY ("userId") REFERENCES public.users(id);


--
-- Name: vouchers FK_7931b35135b815f6ccbc9fdc112; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vouchers
    ADD CONSTRAINT "FK_7931b35135b815f6ccbc9fdc112" FOREIGN KEY ("createdByUserId") REFERENCES public.users(id);


--
-- Name: access_requests FK_7b409335b4848b218c30ea25f04; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.access_requests
    ADD CONSTRAINT "FK_7b409335b4848b218c30ea25f04" FOREIGN KEY ("userId") REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: violations FK_7b927b0273241c52c53f68ebbed; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.violations
    ADD CONSTRAINT "FK_7b927b0273241c52c53f68ebbed" FOREIGN KEY ("businessDayId") REFERENCES public.business_days(id);


--
-- Name: point_ledgers FK_7c2260ae62a6d3c13b79ed5854d; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.point_ledgers
    ADD CONSTRAINT "FK_7c2260ae62a6d3c13b79ed5854d" FOREIGN KEY ("memberId") REFERENCES public.members(id) ON DELETE CASCADE;


--
-- Name: employee_shift_schedules FK_7e8838011e3819b4754a724675c; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employee_shift_schedules
    ADD CONSTRAINT "FK_7e8838011e3819b4754a724675c" FOREIGN KEY ("userId") REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: shift_stock_reports FK_818b3630c59f086b75021f3a8f0; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shift_stock_reports
    ADD CONSTRAINT "FK_818b3630c59f086b75021f3a8f0" FOREIGN KEY ("shiftId") REFERENCES public.shifts(id);


--
-- Name: order_items FK_90f5b79e1f6e8cf7a9b0eaadade; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT "FK_90f5b79e1f6e8cf7a9b0eaadade" FOREIGN KEY ("createdByUserId") REFERENCES public.users(id);


--
-- Name: transactions FK_9639c0f852b113c10fddfb2ef7f; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT "FK_9639c0f852b113c10fddfb2ef7f" FOREIGN KEY ("openedByUserId") REFERENCES public.users(id);


--
-- Name: approval_history FK_969cdb558b45ce0eec3f4e37ec7; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.approval_history
    ADD CONSTRAINT "FK_969cdb558b45ce0eec3f4e37ec7" FOREIGN KEY ("approvalRequestId") REFERENCES public.approval_requests(id);


--
-- Name: order_items FK_96f6ecd3c02d5de09e76b8b19f0; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT "FK_96f6ecd3c02d5de09e76b8b19f0" FOREIGN KEY ("completedByUserId") REFERENCES public.users(id);


--
-- Name: chat_messages FK_9a197c82c9ea44d75bc145a6e2c; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT "FK_9a197c82c9ea44d75bc145a6e2c" FOREIGN KEY ("receiverId") REFERENCES public.users(id);


--
-- Name: transactions FK_9b287c8d23ee047a05728686838; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT "FK_9b287c8d23ee047a05728686838" FOREIGN KEY ("voucherId") REFERENCES public.vouchers(id) ON DELETE SET NULL;


--
-- Name: ingredient_batches FK_9b8cc13deebf8c160257f378a67; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ingredient_batches
    ADD CONSTRAINT "FK_9b8cc13deebf8c160257f378a67" FOREIGN KEY ("ingredientId") REFERENCES public.ingredients(id);


--
-- Name: cashflow FK_9c746313756d85e5387cc1fc350; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cashflow
    ADD CONSTRAINT "FK_9c746313756d85e5387cc1fc350" FOREIGN KEY ("shiftId") REFERENCES public.shifts(id);


--
-- Name: recipes FK_9ec0120c33a1c546fe5ae7e004b; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.recipes
    ADD CONSTRAINT "FK_9ec0120c33a1c546fe5ae7e004b" FOREIGN KEY ("ingredientId") REFERENCES public.ingredients(id);


--
-- Name: vouchers FK_a2a0964fb33c0f3c702a10a3cd6; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vouchers
    ADD CONSTRAINT "FK_a2a0964fb33c0f3c702a10a3cd6" FOREIGN KEY ("memberId") REFERENCES public.members(id);


--
-- Name: shift_stock_reports FK_a663809dc003974434a9f55cc61; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shift_stock_reports
    ADD CONSTRAINT "FK_a663809dc003974434a9f55cc61" FOREIGN KEY ("ingredientId") REFERENCES public.ingredients(id);


--
-- Name: ai_upsell_prompts FK_aa77ff993d6e10cbcc77ae43c90; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_upsell_prompts
    ADD CONSTRAINT "FK_aa77ff993d6e10cbcc77ae43c90" FOREIGN KEY ("promoId") REFERENCES public.promos(id);


--
-- Name: approval_history FK_aee01a8e42edc7b82570a03a4eb; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.approval_history
    ADD CONSTRAINT "FK_aee01a8e42edc7b82570a03a4eb" FOREIGN KEY ("userId") REFERENCES public.users(id);


--
-- Name: employee_shift_schedules FK_b533eab7945222a72085ea4b8fb; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employee_shift_schedules
    ADD CONSTRAINT "FK_b533eab7945222a72085ea4b8fb" FOREIGN KEY ("swappedWithUserId") REFERENCES public.users(id);


--
-- Name: ai_upsell_prompts FK_b8cd1b8d215d44920b45ed2209a; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_upsell_prompts
    ADD CONSTRAINT "FK_b8cd1b8d215d44920b45ed2209a" FOREIGN KEY ("businessDayId") REFERENCES public.business_days(id);


--
-- Name: sessions FK_be3f800d7f0ad0c767e749c98ca; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT "FK_be3f800d7f0ad0c767e749c98ca" FOREIGN KEY ("tableId") REFERENCES public.tables(id);


--
-- Name: payroll_configs FK_be94d67920f2fda44a925749e4f; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payroll_configs
    ADD CONSTRAINT "FK_be94d67920f2fda44a925749e4f" FOREIGN KEY ("userId") REFERENCES public.users(id);


--
-- Name: transactions FK_bf449acefa462b55414811c264a; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT "FK_bf449acefa462b55414811c264a" FOREIGN KEY ("paidByUserId") REFERENCES public.users(id);


--
-- Name: transaction_payments FK_ca7feb8579c489b118d17171450; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transaction_payments
    ADD CONSTRAINT "FK_ca7feb8579c489b118d17171450" FOREIGN KEY ("shiftId") REFERENCES public.shifts(id);


--
-- Name: stock_payments FK_ce220b23135d1cb6fdcc4028623; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_payments
    ADD CONSTRAINT "FK_ce220b23135d1cb6fdcc4028623" FOREIGN KEY ("userId") REFERENCES public.users(id);


--
-- Name: stock_ins FK_d2820bb8c5a25b16242582615fe; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_ins
    ADD CONSTRAINT "FK_d2820bb8c5a25b16242582615fe" FOREIGN KEY ("receivedByUserId") REFERENCES public.users(id);


--
-- Name: menu_items FK_d56e5ccc298e8bf721f75a7eb96; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.menu_items
    ADD CONSTRAINT "FK_d56e5ccc298e8bf721f75a7eb96" FOREIGN KEY ("categoryId") REFERENCES public.categories(id);


--
-- Name: order_items FK_d5a003e6414a4703a91d7ad8339; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT "FK_d5a003e6414a4703a91d7ad8339" FOREIGN KEY ("paymentId") REFERENCES public.transaction_payments(id);


--
-- Name: order_items FK_d8453d5a71e525d9b406c35aab8; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT "FK_d8453d5a71e525d9b406c35aab8" FOREIGN KEY ("menuItemId") REFERENCES public.menu_items(id);


--
-- Name: violations FK_e00861e7c0d904c18fdc2a8cae4; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.violations
    ADD CONSTRAINT "FK_e00861e7c0d904c18fdc2a8cae4" FOREIGN KEY ("userId") REFERENCES public.users(id);


--
-- Name: payroll_releases FK_ea640a4af3773728a9e52fa19b4; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payroll_releases
    ADD CONSTRAINT "FK_ea640a4af3773728a9e52fa19b4" FOREIGN KEY ("releasedByUserId") REFERENCES public.users(id);


--
-- Name: billiard_packages FK_f107041234b8d55fce09e1d1d08; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.billiard_packages
    ADD CONSTRAINT "FK_f107041234b8d55fce09e1d1d08" FOREIGN KEY ("categoryId") REFERENCES public.asset_categories(id) ON DELETE SET NULL;


--
-- Name: battle_plan_items FK_f2ea8ab6dedbe106996c5e6c625; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.battle_plan_items
    ADD CONSTRAINT "FK_f2ea8ab6dedbe106996c5e6c625" FOREIGN KEY ("promoId") REFERENCES public.promos(id) ON DELETE CASCADE;


--
-- Name: transactions FK_f319c71d795e4945a43309dfa8a; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT "FK_f319c71d795e4945a43309dfa8a" FOREIGN KEY ("tableId") REFERENCES public.tables(id);


--
-- Name: transaction_payments FK_fbce903dbf0662d9a27a61fcfeb; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transaction_payments
    ADD CONSTRAINT "FK_fbce903dbf0662d9a27a61fcfeb" FOREIGN KEY ("transactionId") REFERENCES public.transactions(id);


--
-- Name: chat_messages FK_fc6b58e41e9a871dacbe9077def; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT "FK_fc6b58e41e9a871dacbe9077def" FOREIGN KEY ("senderId") REFERENCES public.users(id);


--
-- Name: ingredient_batches FK_fe708acda093984415348a2f2e1; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ingredient_batches
    ADD CONSTRAINT "FK_fe708acda093984415348a2f2e1" FOREIGN KEY ("stockInId") REFERENCES public.stock_ins(id);


--
-- PostgreSQL database dump complete
--

\unrestrict Bd8J4zEcze6biVBPP7pKOYpnrwHdwV0XsSChXoCCMJwhQ9VN168aib31dflnAFl

