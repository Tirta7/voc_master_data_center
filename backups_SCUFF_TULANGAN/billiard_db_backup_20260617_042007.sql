--
-- PostgreSQL database dump
--

\restrict bNkPCaG13x5NseLVK68jQnoTcWxT0gyoVLxLz3EINsPneMZpyv4zzvLS9arrimd

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
    "isIotBypassed" boolean DEFAULT false NOT NULL,
    "enableAISalesOrchestrator" boolean DEFAULT false NOT NULL,
    "enableBounceBack" boolean DEFAULT false NOT NULL
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
1	4	25	\N	\N	3	MEJA 3	f	t	\N	\N	\N	\N	MEJA 3 baru saja duduk. Coba tawarkan POWER ADE (AI Target)!	f	1	0.00	2026-06-15 18:36:14.769576	2026-06-15 18:36:23.122509
2	4	25	\N	\N	7	MEJA 7	f	t	\N	\N	\N	\N	MEJA 7 baru saja duduk. Coba tawarkan POWER ADE (AI Target)!	f	1	0.00	2026-06-15 19:04:44.266905	2026-06-15 19:05:01.139676
3	4	35	\N	\N	1	MEJA 1	f	t	\N	\N	\N	\N	MEJA 1 baru saja duduk. Coba tawarkan TEBS (AI Target)!	f	1	0.00	2026-06-15 19:12:35.648461	2026-06-15 19:12:39.88102
4	4	35	\N	\N	4	MEJA 4	f	t	\N	\N	\N	\N	MEJA 4 baru saja duduk. Coba tawarkan TEBS (AI Target)!	f	1	0.00	2026-06-15 19:31:26.798579	2026-06-15 19:31:31.411625
5	4	35	\N	\N	8	MEJA 8	f	t	\N	\N	\N	\N	MEJA 8 baru saja duduk. Coba tawarkan TEBS (AI Target)!	f	1	0.00	2026-06-15 19:39:40.560581	2026-06-15 19:39:46.118457
6	4	35	\N	\N	2	MEJA 2	f	t	\N	\N	\N	\N	MEJA 2 baru saja duduk. Coba tawarkan TEBS (AI Target)!	f	1	0.00	2026-06-15 19:44:06.334623	2026-06-15 19:44:10.88703
7	4	35	\N	\N	6	MEJA 6	f	t	\N	\N	\N	\N	MEJA 6 baru saja duduk. Coba tawarkan TEBS (AI Target)!	f	1	0.00	2026-06-15 19:46:10.566651	2026-06-15 19:46:15.583311
8	4	35	\N	\N	5	MEJA 5	f	t	\N	\N	\N	\N	MEJA 5 baru saja duduk. Coba tawarkan TEBS (AI Target)!	f	1	0.00	2026-06-15 20:23:37.753977	2026-06-15 20:23:39.753293
9	4	35	\N	\N	4	MEJA 4	f	f	\N	\N	\N	\N	MEJA 4 baru saja duduk. Coba tawarkan TEBS (AI Target)!	f	0	0.00	2026-06-15 20:45:09.491063	2026-06-15 20:45:09.491063
10	4	35	\N	\N	3	MEJA 3	f	t	\N	\N	\N	\N	MEJA 3 baru saja duduk. Coba tawarkan TEBS (AI Target)!	f	1	0.00	2026-06-15 20:58:34.609018	2026-06-15 20:58:39.056859
11	4	35	\N	\N	2	MEJA 2	f	t	\N	\N	\N	\N	MEJA 2 baru saja duduk. Coba tawarkan TEBS (AI Target)!	f	1	0.00	2026-06-15 21:24:01.307728	2026-06-15 21:24:03.256176
12	4	35	\N	\N	7	MEJA 7	f	t	\N	\N	\N	\N	MEJA 7 baru saja duduk. Coba tawarkan TEBS (AI Target)!	f	1	0.00	2026-06-15 21:28:14.472175	2026-06-15 21:28:16.548662
13	4	35	\N	\N	12	MEJA 12	f	t	\N	\N	\N	\N	MEJA 12 baru saja duduk. Coba tawarkan TEBS (AI Target)!	f	1	0.00	2026-06-15 21:40:54.762007	2026-06-15 21:40:57.456953
14	4	35	\N	\N	8	MEJA 8	f	t	\N	\N	\N	\N	MEJA 8 baru saja duduk. Coba tawarkan TEBS (AI Target)!	f	1	0.00	2026-06-15 21:52:31.821782	2026-06-15 21:52:34.533415
15	4	38	\N	\N	3	MEJA 3	f	t	\N	\N	\N	\N	MEJA 3 baru saja duduk. Coba tawarkan NUGGET (AI Target)!	f	1	0.00	2026-06-15 23:34:48.84005	2026-06-15 23:35:14.276032
16	4	38	\N	\N	5	MEJA 5	f	t	\N	\N	\N	\N	MEJA 5 baru saja duduk. Coba tawarkan NUGGET (AI Target)!	f	1	0.00	2026-06-15 23:49:02.609835	2026-06-15 23:49:04.406031
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
18	12	3	1	VERIFY		2026-06-13 12:29:25.742098
19	11	3	1	VERIFY		2026-06-13 12:29:27.42484
20	13	3	1	VERIFY		2026-06-13 14:19:13.680629
21	13	1	2	BYPASS	[BYPASS] 	2026-06-13 20:49:05.959779
22	12	1	2	BYPASS	[BYPASS] 	2026-06-13 20:49:08.449171
23	11	1	2	BYPASS	[BYPASS] 	2026-06-13 20:49:17.726461
24	19	1	1	BYPASS	[BYPASS] 	2026-06-15 15:35:14.050713
25	18	1	1	BYPASS	[BYPASS] 	2026-06-15 15:35:19.60358
26	24	1	1	BYPASS	[BYPASS] 	2026-06-17 02:41:24.889012
27	23	1	1	BYPASS	[BYPASS] 	2026-06-17 02:41:27.228691
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
25	CLOSING	10	[1,2]	0	PENDING	{"shiftName":"SHIFT 2","userName":"Kasir 2","cashSystem":1528000,"cashPhysical":1518500,"discrepancy":-9500,"totalRevenue":1118000,"paymentMethods":{"CASH":1028000,"QRIS":90000,"TRANSFER":0,"MEMBER":0},"expenses":[],"netCashflow":1118000,"stockAudit":[],"stockReportStatus":null}	4	2026-06-17 01:41:42.670882	2026-06-17 01:41:42.670882
10	DATA_EDIT	58	[1,2]	1	APPROVED	{"entityType":"INGREDIENT","itemName":"CAPUCINO","price":0,"payload":{"name":"CAPPUCINO","sku":"IG-009","category":"Packaging","unit":"Gram","costPrice":0,"stockQuantity":54,"minStockLevel":2,"yieldPercentage":100,"description":"","imageUrl":"","department":"CASHIER","isHighValue":false,"isMandatoryReporting":false,"auditFrequency":"SHIFT","expiryDate":null,"isBatchTracked":false,"baseUnit":"","displayUnit":"","conversionFactor":0,"wasteThreshold":0},"changes":{"name":{"old":"CAPUCINO","new":"CAPPUCINO"}},"fieldLabels":{"name":"Nama","sku":"SKU","category":"Kategori","unit":"Satuan","costPrice":"Harga Beli","stockQuantity":"Stok Saat Ini","minStockLevel":"Batas Minimum","yieldPercentage":"% Yield","description":"Deskripsi","imageUrl":"URL Gambar","department":"Departemen","isHighValue":"High Value","auditFrequency":"Audit","expiryDate":"Tgl Kadaluwarsa","isBatchTracked":"Lacak Batch","baseUnit":"Unit Dasar","displayUnit":"Unit Jual","conversionFactor":"Faktor Konversi","wasteThreshold":"Batas Perca"}}	1	2026-06-13 04:06:44.936444	2026-06-13 04:06:58.999151
9	DATA_EDIT	1	[1,2]	1	APPROVED	{"entityType":"MENU_ITEM","itemName":"REDVALVET","price":0,"payload":{"name":"REDVALVET","sku":"MNU-1781297746738","categoryId":4,"productionTarget":"","expiryDate":null,"price":1,"taxPercentage":0,"stockQuantity":64,"minStockLevel":2,"description":"","imageUrl":"","productFinance":{"id":1,"menuItemId":1,"baseHpp":"0.00","targetMarginPercent":100,"targetMarkupFixed":"0.00","targetMarkupPercent":"0.00","targetMultiplier":"3.00","maxHppThreshold":"35.00","pricingAdvice":"","createdAt":"2026-06-12T20:55:46.737Z","updatedAt":"2026-06-12T20:57:58.489Z"},"department":"CASHIER","isHighValue":false,"isMandatoryReporting":false,"auditFrequency":"SHIFT"},"changes":{"price":{"old":0,"new":1}},"fieldLabels":{"name":"Nama Menu","sku":"SKU / Kode","price":"Harga Jual","taxPercentage":"Pajak (%)","stockQuantity":"Stok Tersedia","minStockLevel":"Min. Stock Alert","department":"Departemen","isActive":"Status Aktif","description":"Deskripsi","imageUrl":"URL Foto","yieldPercentage":"Yield (%)","categoryId":"Kategori ID","expiryDate":"Tgl Kadaluwarsa"}}	1	2026-06-13 03:58:11.216149	2026-06-13 03:58:18.326244
8	DATA_EDIT	2	[1,2]	1	APPROVED	{"entityType":"MENU_ITEM","itemName":"RICH CHOCO","price":0,"payload":{"name":"RICH CHOCO","sku":"MNU-1781297810483","categoryId":4,"productionTarget":"","expiryDate":null,"price":1,"taxPercentage":0,"stockQuantity":55,"minStockLevel":2,"description":"","imageUrl":"","productFinance":{"id":2,"menuItemId":2,"baseHpp":"0.00","targetMarginPercent":100,"targetMarkupFixed":"0.00","targetMarkupPercent":"0.00","targetMultiplier":"3.00","maxHppThreshold":"35.00","pricingAdvice":"","createdAt":"2026-06-12T20:56:50.482Z","updatedAt":"2026-06-12T20:57:54.136Z"},"department":"CASHIER","isHighValue":false,"isMandatoryReporting":false,"auditFrequency":"SHIFT"},"changes":{"price":{"old":0,"new":1}},"fieldLabels":{"name":"Nama Menu","sku":"SKU / Kode","price":"Harga Jual","taxPercentage":"Pajak (%)","stockQuantity":"Stok Tersedia","minStockLevel":"Min. Stock Alert","department":"Departemen","isActive":"Status Aktif","description":"Deskripsi","imageUrl":"URL Foto","yieldPercentage":"Yield (%)","categoryId":"Kategori ID","expiryDate":"Tgl Kadaluwarsa"}}	1	2026-06-13 03:58:05.362669	2026-06-13 03:58:20.905391
24	STOCK_UPDATE	79	[1,2]	1	APPROVED	{"itemName":"WATER LEMON SPRITE","quantity":10200,"type":"add","reason":"BARANG DATANG","userName":"kasir2","stockBefore":1275,"stockAfter":11475,"category":"Packaging"}	4	2026-06-16 17:40:43.313914	2026-06-17 02:41:24.889012
12	DATA_EDIT	18	[1,2]	1	APPROVED	{"entityType":"MENU_ITEM","itemName":"SPRITE","price":7000,"payload":{"name":"SPRITE","sku":"MNU-1781328095578","categoryId":6,"productionTarget":"","expiryDate":null,"price":8000,"taxPercentage":0,"stockQuantity":10140,"minStockLevel":1000,"description":"","imageUrl":"","productFinance":{"id":17,"menuItemId":18,"baseHpp":"0.00","targetMarginPercent":100,"targetMarkupFixed":"0.00","targetMarkupPercent":"0.00","targetMultiplier":"3.00","maxHppThreshold":"35.00","pricingAdvice":"","createdAt":"2026-06-13T05:21:35.577Z","updatedAt":"2026-06-13T05:21:41.506Z"},"department":"BAR","isHighValue":false,"isMandatoryReporting":false,"auditFrequency":"SHIFT"},"changes":{"price":{"old":7000,"new":8000}},"fieldLabels":{"name":"Nama Menu","sku":"SKU / Kode","price":"Harga Jual","taxPercentage":"Pajak (%)","stockQuantity":"Stok Tersedia","minStockLevel":"Min. Stock Alert","department":"Departemen","isActive":"Status Aktif","description":"Deskripsi","imageUrl":"URL Foto","yieldPercentage":"Yield (%)","categoryId":"Kategori ID","expiryDate":"Tgl Kadaluwarsa"}}	3	2026-06-13 12:22:23.763585	2026-06-13 20:49:08.449171
14	CLOSING	3	[1,2]	0	PENDING	{"shiftName":"SHIFT 1","userName":"Kasir 1","cashSystem":636000,"cashPhysical":136000,"discrepancy":-500000,"totalRevenue":136000,"paymentMethods":{"CASH":136000,"QRIS":0,"TRANSFER":0,"MEMBER":0},"expenses":[],"netCashflow":136000,"stockAudit":[],"stockReportStatus":null}	3	2026-06-13 18:00:49.248848	2026-06-13 18:00:49.248848
13	DATA_EDIT	95	[1,2]	1	APPROVED	{"entityType":"INGREDIENT","itemName":"NUGGET","price":0,"payload":{"name":"NUGGET","sku":"IG-027","category":"Packaging","unit":"Pcs","costPrice":0,"stockQuantity":80,"minStockLevel":8,"yieldPercentage":100,"description":"","imageUrl":"","department":"KITCHEN","isHighValue":false,"isMandatoryReporting":false,"auditFrequency":"SHIFT","expiryDate":null,"isBatchTracked":false,"baseUnit":"","displayUnit":"","conversionFactor":0,"wasteThreshold":0},"changes":{"unit":{"old":"Gram","new":"Pcs"},"stockQuantity":{"old":1000,"new":80},"minStockLevel":{"old":100,"new":8}},"fieldLabels":{"name":"Nama","sku":"SKU","category":"Kategori","unit":"Satuan","costPrice":"Harga Beli","stockQuantity":"Stok Saat Ini","minStockLevel":"Batas Minimum","yieldPercentage":"% Yield","description":"Deskripsi","imageUrl":"URL Gambar","department":"Departemen","isHighValue":"High Value","auditFrequency":"Audit","expiryDate":"Tgl Kadaluwarsa","isBatchTracked":"Lacak Batch","baseUnit":"Unit Dasar","displayUnit":"Unit Jual","conversionFactor":"Faktor Konversi","wasteThreshold":"Batas Perca"}}	3	2026-06-13 14:19:06.838053	2026-06-13 20:49:05.959779
11	DATA_EDIT	62	[1,2]	1	APPROVED	{"entityType":"INGREDIENT","itemName":"MIX PLATER","price":15000,"payload":{"name":"MIX PLATER","sku":"IG-001","category":"Raw Material","unit":"Gram","costPrice":15000,"stockQuantity":10,"minStockLevel":5,"yieldPercentage":100,"description":"","imageUrl":"","department":"KITCHEN","isHighValue":false,"isMandatoryReporting":false,"auditFrequency":"SHIFT","expiryDate":null,"isBatchTracked":false,"baseUnit":"","displayUnit":"","conversionFactor":0,"wasteThreshold":0},"changes":{"category":{"old":"Packaging","new":"Raw Material"}},"fieldLabels":{"name":"Nama","sku":"SKU","category":"Kategori","unit":"Satuan","costPrice":"Harga Beli","stockQuantity":"Stok Saat Ini","minStockLevel":"Batas Minimum","yieldPercentage":"% Yield","description":"Deskripsi","imageUrl":"URL Gambar","department":"Departemen","isHighValue":"High Value","auditFrequency":"Audit","expiryDate":"Tgl Kadaluwarsa","isBatchTracked":"Lacak Batch","baseUnit":"Unit Dasar","displayUnit":"Unit Jual","conversionFactor":"Faktor Konversi","wasteThreshold":"Batas Perca"}}	3	2026-06-13 10:53:32.348821	2026-06-13 20:49:17.726461
15	CLOSING	4	[1,2]	0	PENDING	{"shiftName":"SHIFT 2","userName":"Kasir 2","cashSystem":2098900,"cashPhysical":2098900,"discrepancy":0,"totalRevenue":2572200,"paymentMethods":{"CASH":1598900,"QRIS":973300,"TRANSFER":0,"MEMBER":0},"expenses":[],"netCashflow":2572200,"stockAudit":[],"stockReportStatus":null}	4	2026-06-14 04:32:26.216799	2026-06-14 04:32:26.216799
16	CLOSING	5	[1,2]	0	PENDING	{"shiftName":"SHIFT 1","userName":"Kasir 1","cashSystem":798000,"cashPhysical":298000,"discrepancy":-500000,"totalRevenue":318000,"paymentMethods":{"CASH":298000,"QRIS":20000,"TRANSFER":0,"MEMBER":0},"expenses":[],"netCashflow":318000,"stockAudit":[],"stockReportStatus":null}	3	2026-06-14 17:11:58.950923	2026-06-14 17:11:58.950923
17	CLOSING	6	[1,2]	0	PENDING	{"shiftName":"SHIFT 2","userName":"Kasir 2","cashSystem":2217500,"cashPhysical":2217500,"discrepancy":0,"totalRevenue":2105500,"paymentMethods":{"CASH":1717500,"QRIS":388000,"TRANSFER":0,"MEMBER":0},"expenses":[],"netCashflow":2105500,"stockAudit":[],"stockReportStatus":null}	4	2026-06-15 04:20:20.636122	2026-06-15 04:20:20.636122
19	DATA_EDIT	80	[1,2]	1	APPROVED	{"entityType":"MENU_ITEM","itemName":"HAND GLOVE","price":20000,"payload":{"name":"HAND GLOVE","sku":"MNU-1781501557754","categoryId":6,"productionTarget":"","expiryDate":null,"price":20000,"taxPercentage":0,"stockQuantity":50,"minStockLevel":1,"description":"","imageUrl":"","productFinance":{"id":77,"menuItemId":80,"baseHpp":"0.00","targetMarginPercent":"100.00","targetMarkupFixed":"0.00","targetMarkupPercent":"0.00","targetMultiplier":"3.00","maxHppThreshold":"35.00","pricingAdvice":"","createdAt":"2026-06-15T05:32:37.753Z","updatedAt":"2026-06-15T05:32:37.753Z"},"department":"CASHIER","isHighValue":false,"isMandatoryReporting":false,"auditFrequency":"SHIFT"},"changes":{"stockQuantity":{"old":59,"new":50}},"fieldLabels":{"name":"Nama Menu","sku":"SKU / Kode","price":"Harga Jual","taxPercentage":"Pajak (%)","stockQuantity":"Stok Tersedia","minStockLevel":"Min. Stock Alert","department":"Departemen","isActive":"Status Aktif","description":"Deskripsi","imageUrl":"URL Foto","yieldPercentage":"Yield (%)","categoryId":"Kategori ID","expiryDate":"Tgl Kadaluwarsa"}}	4	2026-06-15 12:34:57.442885	2026-06-15 15:35:14.050713
18	DATA_EDIT	151	[1,2]	1	APPROVED	{"entityType":"INGREDIENT","itemName":"HAND GLOVE","price":20000,"payload":{"name":"HAND GLOVE","sku":"IG-074","category":"Packaging","unit":"Pcs","costPrice":20000,"stockQuantity":60,"minStockLevel":1,"yieldPercentage":100,"description":"","imageUrl":"","department":"CASHIER","isHighValue":false,"isMandatoryReporting":false,"auditFrequency":"SHIFT","expiryDate":null,"isBatchTracked":false,"baseUnit":"","displayUnit":"","conversionFactor":0,"wasteThreshold":0},"changes":{},"fieldLabels":{"name":"Nama","sku":"SKU","category":"Kategori","unit":"Satuan","costPrice":"Harga Beli","stockQuantity":"Stok Saat Ini","minStockLevel":"Batas Minimum","yieldPercentage":"% Yield","description":"Deskripsi","imageUrl":"URL Gambar","department":"Departemen","isHighValue":"High Value","auditFrequency":"Audit","expiryDate":"Tgl Kadaluwarsa","isBatchTracked":"Lacak Batch","baseUnit":"Unit Dasar","displayUnit":"Unit Jual","conversionFactor":"Faktor Konversi","wasteThreshold":"Batas Perca"}}	4	2026-06-15 12:34:27.205907	2026-06-15 15:35:19.60358
20	CLOSING	7	[1,2]	0	PENDING	{"shiftName":"SHIFT 1","userName":"Kasir 2","cashSystem":934000,"cashPhysical":434000,"discrepancy":-500000,"totalRevenue":434000,"paymentMethods":{"CASH":434000,"QRIS":0,"TRANSFER":0,"MEMBER":0},"expenses":[],"netCashflow":434000,"stockAudit":[],"stockReportStatus":null}	4	2026-06-15 17:25:04.290617	2026-06-15 17:25:04.290617
21	CLOSING	8	[1,2]	0	PENDING	{"shiftName":"SHIFT 2","userName":"Kasir 2","cashSystem":1717600,"cashPhysical":1217600,"discrepancy":-500000,"totalRevenue":1445500,"paymentMethods":{"CASH":1217600,"QRIS":227900,"TRANSFER":0,"MEMBER":0},"expenses":[],"netCashflow":1445500,"stockAudit":[],"stockReportStatus":null}	4	2026-06-16 02:01:46.771747	2026-06-16 02:01:46.771747
22	CLOSING	9	[1,2]	0	PENDING	{"shiftName":"SHIFT 1","userName":"Kasir 1","cashSystem":934000,"cashPhysical":434000,"discrepancy":-500000,"totalRevenue":531000,"paymentMethods":{"CASH":434000,"QRIS":97000,"TRANSFER":0,"MEMBER":0},"expenses":[],"netCashflow":531000,"stockAudit":[],"stockReportStatus":null}	3	2026-06-16 17:32:57.337544	2026-06-16 17:32:57.337544
23	DATA_EDIT	71	[1,2]	1	APPROVED	{"entityType":"INGREDIENT","itemName":"NUTRI BOST","price":0,"payload":{"name":"NUTRI BOST","sku":"IG-008","category":"Packaging","unit":"Pcs","costPrice":0,"stockQuantity":61,"minStockLevel":2,"yieldPercentage":100,"description":"","imageUrl":"","department":"BAR","isHighValue":false,"isMandatoryReporting":false,"auditFrequency":"SHIFT","expiryDate":null,"isBatchTracked":false,"baseUnit":"","displayUnit":"","conversionFactor":0,"wasteThreshold":0},"changes":{"unit":{"old":"Ml","new":"Pcs"},"stockQuantity":{"old":300,"new":61},"minStockLevel":{"old":500,"new":2}},"fieldLabels":{"name":"Nama","sku":"SKU","category":"Kategori","unit":"Satuan","costPrice":"Harga Beli","stockQuantity":"Stok Saat Ini","minStockLevel":"Batas Minimum","yieldPercentage":"% Yield","description":"Deskripsi","imageUrl":"URL Gambar","department":"Departemen","isHighValue":"High Value","auditFrequency":"Audit","expiryDate":"Tgl Kadaluwarsa","isBatchTracked":"Lacak Batch","baseUnit":"Unit Dasar","displayUnit":"Unit Jual","conversionFactor":"Faktor Konversi","wasteThreshold":"Batas Perca"}}	4	2026-06-16 17:38:18.88326	2026-06-17 02:41:27.228691
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
21	2	2026-06-13	\N	\N	\N	ALPHA	t	SYSTEM_CRON	2026-06-14 04:00:00.801	0	f	\N	Otomatis: Tidak ada rekaman absensi (OVERTIME)	2026-06-14 04:00:00.802285	2026-06-14 04:00:00.802285	\N
23	4	2026-06-13	\N	\N	\N	ALPHA	t	SYSTEM_CRON	2026-06-14 04:00:00.916	0	f	\N	Otomatis: Tidak ada rekaman absensi (SHIFT 2)	2026-06-14 04:00:00.916776	2026-06-14 04:00:00.916776	\N
25	3	2026-06-13	\N	\N	\N	ALPHA	t	SYSTEM_CRON	2026-06-14 04:00:01.077	0	f	\N	Otomatis: Tidak ada rekaman absensi (SHIFT 1)	2026-06-14 04:00:01.077352	2026-06-14 04:00:01.077352	\N
27	5	2026-06-13	\N	\N	\N	ALPHA	t	SYSTEM_CRON	2026-06-14 04:00:01.225	0	f	\N	Otomatis: Tidak ada rekaman absensi	2026-06-14 04:00:01.226137	2026-06-14 04:00:01.226137	\N
29	1	2026-06-13	\N	\N	\N	ALPHA	t	SYSTEM_CRON	2026-06-14 04:00:01.297	0	f	\N	Otomatis: Tidak ada rekaman absensi	2026-06-14 04:00:01.297707	2026-06-14 04:00:01.297707	\N
31	2	2026-06-14	\N	\N	\N	ALPHA	t	SYSTEM_CRON	2026-06-16 04:00:00.625	0	f	\N	Otomatis: Tidak ada rekaman absensi (OVERTIME)	2026-06-16 04:00:00.626775	2026-06-16 04:00:00.626775	\N
33	4	2026-06-14	\N	\N	\N	ALPHA	t	SYSTEM_CRON	2026-06-16 04:00:00.813	0	f	\N	Otomatis: Tidak ada rekaman absensi (SHIFT 2)	2026-06-16 04:00:00.813702	2026-06-16 04:00:00.813702	\N
35	3	2026-06-14	\N	\N	\N	ALPHA	t	SYSTEM_CRON	2026-06-16 04:00:00.974	0	f	\N	Otomatis: Tidak ada rekaman absensi (SHIFT 1)	2026-06-16 04:00:00.974934	2026-06-16 04:00:00.974934	\N
37	5	2026-06-14	\N	\N	\N	ALPHA	t	SYSTEM_CRON	2026-06-16 04:00:01.102	0	f	\N	Otomatis: Tidak ada rekaman absensi	2026-06-16 04:00:01.103202	2026-06-16 04:00:01.103202	\N
39	1	2026-06-14	\N	\N	\N	ALPHA	t	SYSTEM_CRON	2026-06-16 04:00:01.225	0	f	\N	Otomatis: Tidak ada rekaman absensi	2026-06-16 04:00:01.226089	2026-06-16 04:00:01.226089	\N
41	2	2026-06-16	\N	\N	\N	ALPHA	t	SYSTEM_CRON	2026-06-17 04:00:01.452	0	f	\N	Otomatis: Tidak ada rekaman absensi (OVERTIME)	2026-06-17 04:00:01.453838	2026-06-17 04:00:01.453838	\N
42	4	2026-06-16	\N	\N	\N	ALPHA	t	SYSTEM_CRON	2026-06-17 04:00:01.732	0	f	\N	Otomatis: Tidak ada rekaman absensi (SHIFT 2)	2026-06-17 04:00:01.733414	2026-06-17 04:00:01.733414	\N
44	3	2026-06-16	\N	\N	\N	ALPHA	t	SYSTEM_CRON	2026-06-17 04:00:01.852	0	f	\N	Otomatis: Tidak ada rekaman absensi (SHIFT 1)	2026-06-17 04:00:01.853405	2026-06-17 04:00:01.853405	\N
46	5	2026-06-16	\N	\N	\N	ALPHA	t	SYSTEM_CRON	2026-06-17 04:00:01.941	0	f	\N	Otomatis: Tidak ada rekaman absensi	2026-06-17 04:00:01.942792	2026-06-17 04:00:01.942792	\N
48	1	2026-06-16	\N	\N	\N	ALPHA	t	SYSTEM_CRON	2026-06-17 04:00:02.019	0	f	\N	Otomatis: Tidak ada rekaman absensi	2026-06-17 04:00:02.020721	2026-06-17 04:00:02.020721	\N
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
124	START_SESSION	kasir1	Mulai meja MEJA 2 (1 JAM WEEKEND) - Tamu: slim	2	\N	2026-06-13 10:21:07.396599
125	START_SESSION	kasir1	Mulai meja MEJA 1 (3 JAM WEEKEND) - Tamu: SALOM	1	\N	2026-06-13 11:02:42.769389
126	STOP_SESSION	Sistem (Auto-Cutoff Prepaid)	Stop sesi meja MEJA 2. Durasi: 60 menit. Total Billiard: Rp 20,000 | Cafe: Rp 0 | SC: Rp 0 | PPN: Rp 0 | Grand Total: Rp 20,000	2	\N	2026-06-13 11:21:07.323903
127	ADD_MENU	kasir1	Menambahkan 1x AIR MINERAL ke MEJA 1	1	\N	2026-06-13 12:03:11.308921
128	START_SESSION	kasir1	Mulai meja MEJA 5 (1 JAM WEEKEND) - Tamu: ROBI	5	\N	2026-06-13 13:58:01.169923
129	BILLIARD_PRICE_OVERRIDE	kasir1	Ubah harga billiard manual dari Rp 20,000 ke Rp 40,000	5	TAB-260613135801	2026-06-13 13:58:08.490086
130	EXTEND_SESSION	kasir1	Tambah waktu meja MEJA 5 selama 60 menit. Tambahan biaya: Rp 20,000	5	\N	2026-06-13 13:58:08.585786
131	STOP_SESSION	Sistem (Auto-Cutoff Prepaid)	Stop sesi meja MEJA 1. Durasi: 180 menit. Total Billiard: Rp 55,000 | Cafe: Rp 6,000 | SC: Rp 0 | PPN: Rp 0 | Grand Total: Rp 61,000 | Item Cafe: 1.000x AIR MINERAL	1	\N	2026-06-13 14:02:42.943836
132	ADD_MENU	kasir1	Menambahkan 1x KOPI GULA AREN ke MEJA 5	5	\N	2026-06-13 14:10:38.189424
133	STOP_SESSION	Sistem (Auto-Cutoff Prepaid)	Stop sesi meja MEJA 5. Durasi: 120 menit. Total Billiard: Rp 40,000 | Cafe: Rp 15,000 | SC: Rp 0 | PPN: Rp 0 | Grand Total: Rp 55,000 | Item Cafe: 1.000x KOPI GULA AREN	5	\N	2026-06-13 15:58:01.847647
134	START_SESSION	kasir2	Mulai meja MEJA 8 (1 JAM WEEKEND) - Tamu: MR. x	8	\N	2026-06-13 18:05:09.235758
135	BILLIARD_PRICE_OVERRIDE	kasir2	Ubah harga billiard manual dari Rp 30,000 ke Rp 60,000	8	TAB-260613180509	2026-06-13 18:05:17.961215
136	EXTEND_SESSION	kasir2	Tambah waktu meja MEJA 8 selama 60 menit. Tambahan biaya: Rp 30,000	8	\N	2026-06-13 18:05:18.044357
137	ADD_MENU	kasir2	Menambahkan 2x AIR MINERAL ke MEJA 8	8	\N	2026-06-13 18:05:36.523817
138	START_SESSION	kasir2	Mulai meja MEJA 4 (1 JAM WEEKEND) - Tamu: YOGA	4	\N	2026-06-13 18:21:19.144
139	ADD_MENU	kasir2	Menambahkan 1x AIR MINERAL ke MEJA 4	4	\N	2026-06-13 18:21:28.945524
140	START_SESSION	kasir2	Mulai meja MEJA 1 (3 JAM WEEKEND) - Tamu: JOKOWI	1	\N	2026-06-13 19:09:05.047532
144	ADD_MENU	kasir2	Menambahkan 1x CAPPUCINNO ke MEJA 12	12	\N	2026-06-13 19:30:15.745647
147	START_SESSION	kasir2	Mulai meja MEJA 2 (OPEN TABLE WEEKEND) - Tamu: RIAN	2	\N	2026-06-13 19:33:51.869684
153	ADD_MENU	kasir2	Menambahkan 1x KOPI HITAM ke MEJA 2	2	\N	2026-06-13 19:54:04.054157
159	START_SESSION	kasir2	Mulai meja MEJA 6 (1 JAM WEEKEND) - Tamu: NGOPEK	6	\N	2026-06-13 20:25:50.52722
141	ADD_MENU	kasir2	Menambahkan 1x ICE TEA ke MEJA 1	1	\N	2026-06-13 19:09:31.615398
142	STOP_SESSION	Sistem (Auto-Cutoff Prepaid)	Stop sesi meja MEJA 4. Durasi: 60 menit. Total Billiard: Rp 30,000 | Cafe: Rp 6,000 | SC: Rp 0 | PPN: Rp 0 | Grand Total: Rp 36,000 | Item Cafe: 1.000x AIR MINERAL	4	\N	2026-06-13 19:21:19.217368
143	START_SESSION	kasir2	Mulai meja MEJA 12 (3 JAM WEEKEND) - Tamu: YUANGGA	12	\N	2026-06-13 19:30:03.182087
145	ADD_MENU	kasir2	Menambahkan 1x KOPI GULA AREN ke MEJA 12	12	\N	2026-06-13 19:30:34.158331
146	ADD_MENU	kasir2	Menambahkan 2x HOT AMERICANO ke MEJA 12	12	\N	2026-06-13 19:30:49.749181
148	ADD_MENU	kasir2	Menambahkan 1x TEMPE KEMUL ke MEJA 12	12	\N	2026-06-13 19:35:01.214606
149	ADD_MENU	kasir2	Menambahkan 1x RUJAK CIRENG ke MEJA 12	12	\N	2026-06-13 19:35:12.456623
150	START_SESSION	kasir2	Mulai meja MEJA 5 (1 JAM WEEKEND) - Tamu: LEONARDO	5	\N	2026-06-13 19:46:20.97749
151	BILLIARD_PRICE_OVERRIDE	kasir2	Ubah harga billiard manual dari Rp 30,000 ke Rp 60,000	5	TAB-260613194620	2026-06-13 19:46:27.28073
152	EXTEND_SESSION	kasir2	Tambah waktu meja MEJA 5 selama 60 menit. Tambahan biaya: Rp 30,000	5	\N	2026-06-13 19:46:27.532138
154	START_SESSION	kasir2	Mulai meja MEJA 4 (1 JAM WEEKEND) - Tamu: KAKA	4	\N	2026-06-13 20:00:46.435768
155	BILLIARD_PRICE_OVERRIDE	kasir2	Ubah harga billiard manual dari Rp 30,000 ke Rp 60,000	4	TAB-260613200046	2026-06-13 20:01:01.610121
156	EXTEND_SESSION	kasir2	Tambah waktu meja MEJA 4 selama 60 menit. Tambahan biaya: Rp 30,000	4	\N	2026-06-13 20:01:01.761781
157	ADD_MENU	kasir2	Menambahkan 2x AIR MINERAL ke MEJA 4	4	\N	2026-06-13 20:01:32.148626
158	STOP_SESSION	Sistem (Auto-Cutoff Prepaid)	Stop sesi meja MEJA 8. Durasi: 120 menit. Total Billiard: Rp 60,000 | Cafe: Rp 12,000 | SC: Rp 0 | PPN: Rp 0 | Grand Total: Rp 72,000 | Item Cafe: 2.000x AIR MINERAL	8	\N	2026-06-13 20:05:09.603866
160	BILLIARD_PRICE_OVERRIDE	kasir2	Ubah harga billiard manual dari Rp 30,000 ke Rp 60,000	6	TAB-260613202550	2026-06-13 20:25:56.385148
161	EXTEND_SESSION	kasir2	Tambah waktu meja MEJA 6 selama 60 menit. Tambahan biaya: Rp 30,000	6	\N	2026-06-13 20:25:56.45933
162	ADD_MENU	kasir2	Menambahkan 1x AIR MINERAL ke MEJA 5	5	\N	2026-06-13 20:26:08.997971
163	ADD_MENU	kasir2	Menambahkan 1x KOPI SUSU ke MEJA 6	6	\N	2026-06-13 20:33:10.712278
164	ADD_MENU	kasir2	Menambahkan 1x KOPI SUSU ke MEJA 6	6	\N	2026-06-13 20:33:34.480087
165	ADD_MENU	kasir2	Menambahkan 2x AIR MINERAL ke MEJA 6	6	\N	2026-06-13 20:33:58.364307
166	START_SESSION	kasir2	Mulai meja MEJA 3 (OPEN TABLE WEEKEND) - Tamu: ASWAR	3	\N	2026-06-13 20:50:45.052253
167	START_SESSION	kasir2	Mulai meja MEJA 8 (1 JAM WEEKEND) - Tamu: SATRIYA	8	\N	2026-06-13 21:08:21.690288
168	BILLIARD_PRICE_OVERRIDE	kasir2	Ubah harga billiard manual dari Rp 30,000 ke Rp 60,000	8	TAB-260613210821	2026-06-13 21:08:24.891681
169	EXTEND_SESSION	kasir2	Tambah waktu meja MEJA 8 selama 60 menit. Tambahan biaya: Rp 30,000	8	\N	2026-06-13 21:08:24.970869
170	ADD_MENU	kasir2	Menambahkan 1x LYCHEE TEA ke MEJA 8	8	\N	2026-06-13 21:08:34.369921
171	START_SESSION	kasir2	Mulai meja MEJA 7 (OPEN TABLE WEEKEND) - Tamu: AWAN	7	\N	2026-06-13 21:16:21.17936
172	ADD_MENU	kasir2	Menambahkan 2x AIR MINERAL ke MEJA 7	7	\N	2026-06-13 21:16:35.225855
173	ADD_MENU	kasir2	Menambahkan 1x AIR MINERAL ke MEJA 2	2	\N	2026-06-13 21:19:11.450113
174	START_SESSION	kasir2	Mulai meja MEJA 9 (OPEN TABLE WEEKEND) - Tamu: OBI	9	\N	2026-06-13 21:38:46.186089
175	ADD_MENU	kasir2	Menambahkan 1x BEEF BURGER ke MEJA 9	9	\N	2026-06-13 21:39:26.380794
176	ADD_MENU	kasir2	Menambahkan 1x RUJAK CIRENG ke MEJA 9	9	\N	2026-06-13 21:39:52.900937
177	ADD_MENU	kasir2	Menambahkan 1x RED VELVET ke MEJA 9	9	\N	2026-06-13 21:40:04.549749
178	ADD_MENU	kasir2	Menambahkan 1x BUBLE GUM/PERMEN KARET ke MEJA 9	9	\N	2026-06-13 21:40:19.631528
179	START_SESSION	kasir2	Mulai meja MEJA 10 (OPEN TABLE WEEKEND) - Tamu: ADIT	10	\N	2026-06-13 21:44:28.119679
180	STOP_SESSION	Sistem (Auto-Cutoff Prepaid)	Stop sesi meja MEJA 5. Durasi: 120 menit. Total Billiard: Rp 60,000 | Cafe: Rp 6,000 | SC: Rp 0 | PPN: Rp 0 | Grand Total: Rp 66,000 | Item Cafe: 1.000x AIR MINERAL	5	\N	2026-06-13 21:46:21.930211
181	ADD_MENU	kasir2	Menambahkan 1x KOPI GULA AREN ke MEJA 10	10	\N	2026-06-13 21:54:17.85499
182	START_SESSION	kasir2	Mulai meja MEJA 5 (1 JAM WEEKEND) - Tamu: ADIT	5	\N	2026-06-13 21:55:38.45454
183	BILLIARD_PRICE_OVERRIDE	kasir2	Ubah harga billiard manual dari Rp 30,000 ke Rp 60,000	5	TAB-260613215538	2026-06-13 21:55:44.594942
184	EXTEND_SESSION	kasir2	Tambah waktu meja MEJA 5 selama 60 menit. Tambahan biaya: Rp 30,000	5	\N	2026-06-13 21:55:44.860234
185	ADD_MENU	kasir2	Menambahkan 1x WATER LEMON SPRITE ke MEJA 5	5	\N	2026-06-13 21:55:58.260738
186	ADD_MENU	kasir2	Menambahkan 1x KOPI GULA AREN ke MEJA 5	5	\N	2026-06-13 21:56:10.760994
187	STOP_SESSION	Sistem (Auto-Cutoff Prepaid)	Stop sesi meja MEJA 4. Durasi: 120 menit. Total Billiard: Rp 60,000 | Cafe: Rp 12,000 | SC: Rp 0 | PPN: Rp 0 | Grand Total: Rp 72,000 | Item Cafe: 2.000x AIR MINERAL	4	\N	2026-06-13 22:00:47.961944
188	START_SESSION	kasir2	Mulai meja MEJA 4 (3 JAM WEEKEND) - Tamu: CAHYO	4	\N	2026-06-13 22:04:39.996334
189	STOP_SESSION	Sistem (Auto-Cutoff Prepaid)	Stop sesi meja MEJA 1. Durasi: 180 menit. Total Billiard: Rp 85,000 | Cafe: Rp 7,000 | SC: Rp 0 | PPN: Rp 0 | Grand Total: Rp 92,000 | Item Cafe: 1.000x ICE TEA	1	\N	2026-06-13 22:09:05.14342
190	START_SESSION	kasir2	Mulai meja MEJA 1 (3 JAM WEEKEND) - Tamu: AMAR	1	\N	2026-06-13 22:11:37.064756
191	ADD_MENU	kasir2	Menambahkan 1x STRAWBERRY BUBBLEGUM ke MEJA 1	1	\N	2026-06-13 22:11:45.465453
192	ADD_MENU	kasir2	Menambahkan 1x COOKIES & CREAM ke MEJA 4	4	\N	2026-06-13 22:11:58.03964
193	ADD_MENU	kasir2	Menambahkan 1x MIX PLATER ke MEJA 4	4	\N	2026-06-13 22:12:06.051024
194	STOP_SESSION	Sistem (Auto-Cutoff Prepaid)	Stop sesi meja MEJA 6. Durasi: 120 menit. Total Billiard: Rp 60,000 | Cafe: Rp 32,000 | SC: Rp 0 | PPN: Rp 0 | Grand Total: Rp 92,000 | Item Cafe: 2.000x AIR MINERAL, 1.000x KOPI SUSU, 1.000x KOPI SUSU	6	\N	2026-06-13 22:25:50.866738
195	START_SESSION	kasir2	Mulai meja MEJA 6 (1 JAM WEEKEND) - Tamu: NOPUL	6	\N	2026-06-13 22:29:12.500156
196	BILLIARD_PRICE_OVERRIDE	kasir2	Ubah harga billiard manual dari Rp 30,000 ke Rp 60,000	6	TAB-260613222912	2026-06-13 22:29:16.982281
197	EXTEND_SESSION	kasir2	Tambah waktu meja MEJA 6 selama 60 menit. Tambahan biaya: Rp 30,000	6	\N	2026-06-13 22:29:17.101181
198	STOP_SESSION	Sistem (Auto-Cutoff Prepaid)	Stop sesi meja MEJA 12. Durasi: 180 menit. Total Billiard: Rp 130,000 | Cafe: Rp 87,000 | SC: Rp 0 | PPN: Rp 0 | Grand Total: Rp 217,000 | Item Cafe: 1.000x KOPI GULA AREN, 2.000x HOT AMERICANO, 1.000x RUJAK CIRENG, 1.000x CAPPUCINNO, 1.000x TEMPE KEMUL	12	\N	2026-06-13 22:30:03.704747
199	BILLIARD_PRICE_OVERRIDE	kasir2	Ubah harga billiard manual dari Rp 53,000 ke Rp 89,000	2	TAB-260613193351	2026-06-13 22:30:57.416513
200	STOP_SESSION	kasir2	Stop sesi meja MEJA 2. Durasi: 177 menit. Total Billiard: Rp 89,000 | Cafe: Rp 16,000 | SC: Rp 0 | PPN: Rp 0 | Grand Total: Rp 105,000 | Item Cafe: 1.000x AIR MINERAL, 1.000x KOPI HITAM	2	\N	2026-06-13 22:30:57.593691
201	STOP_SESSION	kasir2	Stop sesi meja MEJA 9. Durasi: 53 menit. Total Billiard: Rp 35,000 | Cafe: Rp 60,000 | SC: Rp 0 | PPN: Rp 0 | Grand Total: Rp 95,000 | Item Cafe: 1.000x BEEF BURGER, 1.000x RUJAK CIRENG, 1.000x RED VELVET, 1.000x BUBLE GUM/PERMEN KARET	9	\N	2026-06-13 22:32:04.519574
202	MOVE_TABLE	kasir2	Move Table Billiard Meja MEJA 3 ke Meja MEJA 2. Total Rp 53,500	2	\N	2026-06-13 22:37:16.462219
203	START_SESSION	kasir2	Mulai meja MEJA 3 (OPEN TABLE WEEKEND) - Tamu: AGUNG	3	\N	2026-06-13 22:37:53.383363
204	START_SESSION	kasir2	Mulai meja MEJA 9 (1 JAM WEEKEND) - Tamu: MIKO	9	\N	2026-06-13 22:44:18.816913
205	START_SESSION	kasir2	Mulai meja MEJA 11 (OPEN TABLE WEEKEND) - Tamu: BAYU	11	\N	2026-06-13 22:53:23.714542
206	ADD_MENU	kasir2	Menambahkan 1x SOSIS MERAH ke MEJA 1	1	\N	2026-06-13 22:54:06.855915
207	ADD_MENU	kasir2	Menambahkan 1x NUGGET ke MEJA 1	1	\N	2026-06-13 22:54:15.476251
208	ADD_MENU	kasir2	Menambahkan 1x LEMON TEA ke MEJA 1	1	\N	2026-06-13 22:54:25.410539
209	ADD_MENU	kasir2	Menambahkan 1x CAPPUCINNO ke MEJA 1	1	\N	2026-06-13 22:54:37.697384
210	STOP_SESSION	Sistem (Auto-Cutoff Prepaid)	Stop sesi meja MEJA 8. Durasi: 120 menit. Total Billiard: Rp 60,000 | Cafe: Rp 10,000 | SC: Rp 0 | PPN: Rp 0 | Grand Total: Rp 70,000 | Item Cafe: 1.000x LYCHEE TEA	8	\N	2026-06-13 23:08:21.822056
211	START_SESSION	kasir2	Mulai meja MEJA 8 (1 JAM WEEKEND) - Tamu: SATRIYO	8	\N	2026-06-13 23:12:03.406023
212	ADD_MENU	kasir2	Menambahkan 1x ICE TEA ke MEJA 11	11	\N	2026-06-13 23:14:49.437616
213	ADD_MENU	kasir2	Menambahkan 2x AIR MINERAL ke MEJA 11	11	\N	2026-06-13 23:14:58.955673
214	ADD_MENU	kasir2	Menambahkan 1x AIR MINERAL ke MEJA 7	7	\N	2026-06-13 23:18:41.019414
215	ADD_MENU	kasir2	Menambahkan 1x CILOK ke MEJA 11	11	\N	2026-06-13 23:21:35.010045
216	ADD_MENU	kasir2	Menambahkan 1x CILOK ke MEJA 11	11	\N	2026-06-13 23:21:50.371537
217	ADD_MENU	kasir2	Menambahkan 1x KENTANG GORENG ke MEJA 11	11	\N	2026-06-13 23:22:03.113205
218	ADD_MENU	kasir2	Menambahkan 1x NUGGET ke MEJA 11	11	\N	2026-06-13 23:22:20.152005
219	BILLIARD_PRICE_OVERRIDE	kasir2	Ubah harga billiard manual dari Rp 35,000 ke Rp 65,333	10	TAB-260613214427	2026-06-13 23:35:51.832467
220	STOP_SESSION	kasir2	Stop sesi meja MEJA 10. Durasi: 111 menit. Total Billiard: Rp 65,333 | Cafe: Rp 15,000 | SC: Rp 0 | PPN: Rp 0 | Grand Total: Rp 80,400 | Item Cafe: 1.000x KOPI GULA AREN	10	\N	2026-06-13 23:35:52.050735
221	ADD_MENU	kasir2	Menambahkan 1x AIR MINERAL ke MEJA 10	10	\N	2026-06-13 23:36:37.089757
222	STOP_SESSION	Sistem (Auto-Cutoff Prepaid)	Stop sesi meja MEJA 9. Durasi: 60 menit. Total Billiard: Rp 35,000 | Cafe: Rp 0 | SC: Rp 0 | PPN: Rp 0 | Grand Total: Rp 35,000	9	\N	2026-06-13 23:44:19.047983
223	ADD_MENU	kasir2	Menambahkan 1x AIR MINERAL ke MEJA 8	8	\N	2026-06-13 23:53:16.351636
224	STOP_SESSION	Sistem (Auto-Cutoff Prepaid)	Stop sesi meja MEJA 5. Durasi: 120 menit. Total Billiard: Rp 60,000 | Cafe: Rp 26,000 | SC: Rp 0 | PPN: Rp 0 | Grand Total: Rp 86,000 | Item Cafe: 1.000x WATER LEMON SPRITE, 1.000x KOPI GULA AREN	5	\N	2026-06-13 23:55:38.93977
225	START_SESSION	kasir2	Mulai meja MEJA 5 (OPEN TABLE WEEKEND) - Tamu: AGUNG	5	\N	2026-06-14 00:03:01.822875
226	ADD_MENU	kasir2	Menambahkan 1x AIR MINERAL ke MEJA 2	2	\N	2026-06-14 00:04:58.591275
227	ADD_MENU	kasir2	Menambahkan 1x KOPI GULA AREN ke MEJA 2	2	\N	2026-06-14 00:05:12.384775
228	BILLIARD_PRICE_OVERRIDE	kasir2	Ubah harga billiard manual dari Rp 61,500 ke Rp 85,000	7	TAB-260613211621	2026-06-14 00:05:22.200239
229	STOP_SESSION	kasir2	Stop sesi meja MEJA 7. Durasi: 169 menit. Total Billiard: Rp 85,000 | Cafe: Rp 18,000 | SC: Rp 0 | PPN: Rp 0 | Grand Total: Rp 103,000 | Item Cafe: 1.000x AIR MINERAL, 2.000x AIR MINERAL	7	\N	2026-06-14 00:05:22.38933
230	ADD_MENU	kasir2	Menambahkan 1x KOPI HITAM ke MEJA 2	2	\N	2026-06-14 00:06:18.932136
231	STOP_SESSION	Sistem (Auto-Cutoff Prepaid)	Stop sesi meja MEJA 8. Durasi: 60 menit. Total Billiard: Rp 30,000 | Cafe: Rp 6,000 | SC: Rp 0 | PPN: Rp 0 | Grand Total: Rp 36,000 | Item Cafe: 1.000x AIR MINERAL	8	\N	2026-06-14 00:12:03.573096
232	BILLIARD_PRICE_OVERRIDE	kasir2	Ubah harga billiard manual dari Rp 98,000 ke Rp 103,000	2	TAB-260613205044	2026-06-14 00:15:57.379166
233	STOP_SESSION	kasir2	Stop sesi meja MEJA 2. Durasi: 205 menit. Total Billiard: Rp 103,000 | Cafe: Rp 31,000 | SC: Rp 0 | PPN: Rp 0 | Grand Total: Rp 134,000 | Item Cafe: 1.000x KOPI GULA AREN, 1.000x AIR MINERAL, 1.000x KOPI HITAM	2	\N	2026-06-14 00:15:57.5617
234	STOP_SESSION	Sistem (Auto-Cutoff Prepaid)	Stop sesi meja MEJA 6. Durasi: 120 menit. Total Billiard: Rp 60,000 | Cafe: Rp 0 | SC: Rp 0 | PPN: Rp 0 | Grand Total: Rp 60,000	6	\N	2026-06-14 00:29:13.020493
235	ADD_MENU	kasir2	Menambahkan 2x AIR MINERAL ke MEJA 6	6	\N	2026-06-14 00:32:56.235093
236	START_SESSION	kasir2	Mulai meja MEJA 7 (OPEN TABLE WEEKEND) - Tamu: VOL	7	\N	2026-06-14 00:42:54.206143
237	ADD_MENU	kasir2	Menambahkan 1x ICE TEA ke MEJA 7	7	\N	2026-06-14 00:46:46.773828
238	ADD_MENU	kasir2	Menambahkan 1x KOPI SUSU ke MEJA 7	7	\N	2026-06-14 00:47:02.538604
239	ADD_MENU	kasir2	Menambahkan 1x LEMON TEA ke MEJA 1	1	\N	2026-06-14 00:53:44.036683
240	ADD_MENU	kasir2	Menambahkan 1x MATCHA ke MEJA 3	3	\N	2026-06-14 00:59:37.793615
241	ADD_MENU	kasir2	Menambahkan 1x TARO ke MEJA 3	3	\N	2026-06-14 00:59:50.643028
242	ADD_MENU	kasir2	Menambahkan 1x KOPI HITAM ke MEJA 5	5	\N	2026-06-14 01:00:05.342148
243	ADD_MENU	kasir2	Menambahkan 1x TARO ke MEJA 5	5	\N	2026-06-14 01:00:17.565267
244	STOP_SESSION	Sistem (Auto-Cutoff Prepaid)	Stop sesi meja MEJA 4. Durasi: 180 menit. Total Billiard: Rp 85,000 | Cafe: Rp 30,000 | SC: Rp 0 | PPN: Rp 0 | Grand Total: Rp 115,000 | Item Cafe: 1.000x MIX PLATER, 1.000x COOKIES & CREAM	4	\N	2026-06-14 01:04:39.876575
245	BILLIARD_PRICE_OVERRIDE	kasir2	Ubah harga billiard manual dari Rp 45,000 ke Rp 101,250	11	TAB-260613225323	2026-06-14 01:07:47.502402
246	STOP_SESSION	kasir2	Stop sesi meja MEJA 11. Durasi: 134 menit. Total Billiard: Rp 101,250 | Cafe: Rp 67,000 | SC: Rp 0 | PPN: Rp 0 | Grand Total: Rp 168,300 | Item Cafe: 1.000x ICE TEA, 1.000x NUGGET, 2.000x AIR MINERAL, 1.000x KENTANG GORENG, 1.000x CILOK, 1.000x CILOK	11	\N	2026-06-14 01:07:48.101143
247	STOP_SESSION	Sistem (Auto-Cutoff Prepaid)	Stop sesi meja MEJA 1. Durasi: 180 menit. Total Billiard: Rp 85,000 | Cafe: Rp 74,000 | SC: Rp 0 | PPN: Rp 0 | Grand Total: Rp 159,000 | Item Cafe: 1.000x NUGGET, 1.000x SOSIS MERAH, 1.000x STRAWBERRY BUBBLEGUM, 1.000x CAPPUCINNO, 1.000x LEMON TEA, 1.000x LEMON TEA	1	\N	2026-06-14 01:11:37.672104
248	START_SESSION	kasir2	Mulai meja MEJA 1 (OPEN TABLE WEEKEND) - Tamu: AMAR	1	\N	2026-06-14 01:13:14.168635
249	START_SESSION	kasir2	Mulai meja MEJA 2 (OPEN TABLE WEEKEND) - Tamu: ?	2	\N	2026-06-14 01:31:50.534714
250	START_SESSION	kasir2	Mulai meja MEJA 6 (OPEN TABLE WEEKEND) - Tamu: TATANG	6	\N	2026-06-14 01:43:55.520598
251	ADD_MENU	kasir2	Menambahkan 1x BUBLE GUM/PERMEN KARET ke MEJA 6	6	\N	2026-06-14 01:52:23.309765
252	ADD_MENU	kasir2	Menambahkan 1x KOPI GULA AREN ke MEJA 6	6	\N	2026-06-14 01:52:44.579034
253	STOP_SESSION	kasir2	Stop sesi meja MEJA 2. Durasi: 47 menit. Total Billiard: Rp 30,000 | Cafe: Rp 0 | SC: Rp 0 | PPN: Rp 0 | Grand Total: Rp 30,000	2	\N	2026-06-14 02:18:46.763654
254	BILLIARD_PRICE_OVERRIDE	kasir2	Ubah harga billiard manual dari Rp 30,000 ke Rp 69,500	5	TAB-260613000301	2026-06-14 02:21:50.972877
255	STOP_SESSION	kasir2	Stop sesi meja MEJA 5. Durasi: 139 menit. Total Billiard: Rp 69,500 | Cafe: Rp 25,000 | SC: Rp 0 | PPN: Rp 0 | Grand Total: Rp 94,500 | Item Cafe: 1.000x KOPI HITAM, 1.000x TARO	5	\N	2026-06-14 02:21:51.14776
256	MOVE_TABLE	kasir2	Move Table Billiard Meja MEJA 6 ke Meja MEJA 5. Total Rp 60,000	5	\N	2026-06-14 02:25:39.719897
257	START_SESSION	kasir2	Mulai meja MEJA 2 (1 JAM WEEKEND) - Tamu: SLIMIN	2	\N	2026-06-14 02:31:09.471757
258	BILLIARD_PRICE_OVERRIDE	kasir2	Ubah harga billiard manual dari Rp 30,000 ke Rp 42,500	1	TAB-260613011314	2026-06-14 02:37:22.372481
312	ADD_MENU	kasir1	Menambahkan 1x HOT TEA ke MEJA 9	9	\N	2026-06-14 15:54:48.768431
259	STOP_SESSION	kasir2	Stop sesi meja MEJA 1. Durasi: 84 menit. Total Billiard: Rp 42,500 | Cafe: Rp 0 | SC: Rp 0 | PPN: Rp 0 | Grand Total: Rp 42,500	1	\N	2026-06-14 02:37:22.581498
260	BILLIARD_PRICE_OVERRIDE	kasir2	Ubah harga billiard manual dari Rp 71,000 ke Rp 129,500	3	TAB-260613223753	2026-06-14 02:56:35.624342
261	STOP_SESSION	kasir2	Stop sesi meja MEJA 3. Durasi: 259 menit. Total Billiard: Rp 129,500 | Cafe: Rp 30,000 | SC: Rp 0 | PPN: Rp 0 | Grand Total: Rp 159,500 | Item Cafe: 1.000x MATCHA, 1.000x TARO	3	\N	2026-06-14 02:56:36.419529
262	BILLIARD_PRICE_OVERRIDE	kasir2	Ubah harga billiard manual dari Rp 30,000 ke Rp 73,000	7	TAB-260613004253	2026-06-14 03:07:55.500171
263	STOP_SESSION	kasir2	Stop sesi meja MEJA 7. Durasi: 145 menit. Total Billiard: Rp 73,000 | Cafe: Rp 17,000 | SC: Rp 0 | PPN: Rp 0 | Grand Total: Rp 90,000 | Item Cafe: 1.000x ICE TEA, 1.000x KOPI SUSU	7	\N	2026-06-14 03:07:55.658247
264	STOP_SESSION	Sistem (Auto-Cutoff Prepaid)	Stop sesi meja MEJA 2. Durasi: 60 menit. Total Billiard: Rp 30,000 | Cafe: Rp 0 | SC: Rp 0 | PPN: Rp 0 | Grand Total: Rp 30,000	2	\N	2026-06-14 03:31:09.796401
265	BILLIARD_PRICE_OVERRIDE	kasir2	Ubah harga billiard manual dari Rp 30,000 ke Rp 84,000	5	TAB-260613014355	2026-06-14 04:31:10.746539
266	STOP_SESSION	kasir2	Stop sesi meja MEJA 5. Durasi: 167 menit. Total Billiard: Rp 84,000 | Cafe: Rp 30,000 | SC: Rp 0 | PPN: Rp 0 | Grand Total: Rp 114,000 | Item Cafe: 1.000x KOPI GULA AREN, 1.000x BUBLE GUM/PERMEN KARET	5	\N	2026-06-14 04:31:10.902993
267	UPDATE_SETTINGS	scuff	Ubah pengaturan: aiAutoPromote: false -> true	\N	\N	2026-06-14 07:36:24.021603
268	UPDATE_SETTINGS	scuff	Ubah pengaturan: aiAutoPromoteThreshold: "0.60" -> 0.6	\N	\N	2026-06-14 07:37:42.347101
269	UPDATE_SETTINGS	scuff	Ubah pengaturan: aiAutoPromoteThreshold: 0.6 -> 0.8	\N	\N	2026-06-14 07:37:43.31245
270	START_SESSION	kasir1	Mulai meja MEJA 5 (1 JAM WEEKEND) - Tamu: YURO	5	\N	2026-06-14 10:11:11.326316
271	START_SESSION	kasir1	Mulai meja MEJA 2 (1 JAM WEEKEND) - Tamu: ANDI	2	\N	2026-06-14 10:30:59.123802
272	STOP_SESSION	Sistem (Auto-Cutoff Prepaid)	Stop sesi meja MEJA 5. Durasi: 60 menit. Total Billiard: Rp 20,000 | Cafe: Rp 0 | SC: Rp 0 | PPN: Rp 0 | Grand Total: Rp 20,000	5	\N	2026-06-14 11:11:11.467685
273	STOP_SESSION	Sistem (Auto-Cutoff Prepaid)	Stop sesi meja MEJA 2. Durasi: 60 menit. Total Billiard: Rp 20,000 | Cafe: Rp 0 | SC: Rp 0 | PPN: Rp 0 | Grand Total: Rp 20,000	2	\N	2026-06-14 11:30:59.273139
274	START_SESSION	kasir1	Mulai meja MEJA 1 (1 JAM WEEKEND) - Tamu: SLIM	1	\N	2026-06-14 11:51:26.267174
275	MOVE_TABLE	kasir1	Move Table Billiard Meja MEJA 1 ke Meja MEJA 2. Total Rp 20,000	2	\N	2026-06-14 11:51:34.270187
276	START_SESSION	kasir1	Mulai meja MEJA 1 (OPEN TABLE WEEKEND) - Tamu: FAJAR	1	\N	2026-06-14 11:55:51.035012
277	ADD_MENU	kasir1	Menambahkan 2x HOT AMERICANO ke MEJA 1	1	\N	2026-06-14 11:56:13.654623
278	ADD_MENU	kasir1	Menambahkan 1x COCA COLA ke MEJA 1	1	\N	2026-06-14 12:14:09.056522
279	ADD_MENU	kasir1	Menambahkan 2x AIR MINERAL ke MEJA 1	1	\N	2026-06-14 12:35:17.022911
280	START_SESSION	kasir1	Mulai meja MEJA 5 (1 JAM WEEKEND) - Tamu: ABI	5	\N	2026-06-14 12:51:05.610832
281	STOP_SESSION	Sistem (Auto-Cutoff Prepaid)	Stop sesi meja MEJA 2. Durasi: 60 menit. Total Billiard: Rp 20,000 | Cafe: Rp 0 | SC: Rp 0 | PPN: Rp 0 | Grand Total: Rp 20,000	2	\N	2026-06-14 12:51:26.683028
282	START_SESSION	kasir1	Mulai meja MEJA 2 (1 JAM WEEKEND) - Tamu: BIMA	2	\N	2026-06-14 13:22:04.461627
283	BILLIARD_PRICE_OVERRIDE	kasir1	Ubah harga billiard manual dari Rp 20,000 ke Rp 40,000	2	TAB-260614132204	2026-06-14 13:22:14.7038
284	EXTEND_SESSION	kasir1	Tambah waktu meja MEJA 2 selama 60 menit. Tambahan biaya: Rp 20,000	2	\N	2026-06-14 13:22:14.821058
285	ADD_MENU	kasir1	Menambahkan 1x AIR MINERAL ke MEJA 2	2	\N	2026-06-14 13:22:31.489638
286	ADD_MENU	kasir1	Menambahkan 1x WATER LEMON SPRITE ke MEJA 2	2	\N	2026-06-14 13:22:47.806317
287	STOP_SESSION	Sistem (Auto-Cutoff Prepaid)	Stop sesi meja MEJA 5. Durasi: 60 menit. Total Billiard: Rp 20,000 | Cafe: Rp 0 | SC: Rp 0 | PPN: Rp 0 | Grand Total: Rp 20,000	5	\N	2026-06-14 13:51:06.520254
288	START_SESSION	kasir1	Mulai meja MEJA 5 (3 JAM WEEKEND) - Tamu: VEGA	5	\N	2026-06-14 14:02:34.442293
289	ADD_MENU	kasir1	Menambahkan 1x ICE TEA (FREE) ke MEJA 5	5	\N	2026-06-14 14:07:04.913982
290	START_SESSION	kasir1	Mulai meja MEJA 4 (OPEN TABLE WEEKEND) - Tamu: RUDIN	4	\N	2026-06-14 14:15:57.232129
291	ADD_MENU	kasir1	Menambahkan 1x ICE TEA ke MEJA 4	4	\N	2026-06-14 14:16:22.741185
292	ADD_MENU	kasir1	Menambahkan 1x AIR MINERAL ke MEJA 4	4	\N	2026-06-14 14:16:38.561821
293	ADD_MENU	kasir1	Menambahkan 1x LEMON TEA ke MEJA 4	4	\N	2026-06-14 14:21:49.715676
294	ADD_MENU	kasir1	Menambahkan 1x AIR MINERAL ke MEJA 5	5	\N	2026-06-14 14:23:38.777607
295	START_SESSION	kasir1	Mulai meja MEJA 6 (1 JAM WEEKEND) - Tamu: DONI	6	\N	2026-06-14 14:42:17.608756
296	BILLIARD_PRICE_OVERRIDE	kasir1	Ubah harga billiard manual dari Rp 20,000 ke Rp 40,000	6	TAB-260614144217	2026-06-14 14:42:27.71615
297	EXTEND_SESSION	kasir1	Tambah waktu meja MEJA 6 selama 60 menit. Tambahan biaya: Rp 20,000	6	\N	2026-06-14 14:42:28.160761
298	ADD_MENU	kasir1	Menambahkan 1x ICE TEA (FREE) ke MEJA 6	6	\N	2026-06-14 14:43:55.207158
299	UPDATE_SETTINGS	kasir1	Ubah pengaturan: customPricingDynamic: [{"categoryId":1,"basePrice":0,"timeSlots":[{"start":"10:00","end":"18:00","price":35000},{"start":"18:00","end":"02:00","price":"40000"},{"start":"02:00","end":"10:00","price":"40000"}]},{"categoryId":2,"basePrice":0,"timeSlots":[{"start":"10:00","end":"18:00","price":"25000"},{"start":"18:00","end":"02:00","price":"30000"},{"start":"02:00","end":"10:00","price":"30000"}]},{"categoryId":3,"basePrice":0,"timeSlots":[{"start":"10:00","end":"18:00","price":"20000"},{"start":"18:00","end":"02:00","price":"25000"},{"start":"02:00","end":"10:00","price":"25000"}]}] -> [{"categoryId":1,"basePrice":0,"timeSlots":[{"start":"10:00","end":"18:00","price":35000},{"start":"18:00","end":"02:00","price":"40000"},{"start":"02:00","end":"10:00","price":"40000"}]},{"categoryId":2,"basePrice":0,"timeSlots":[{"start":"10:00","end":"18:00","price":"25000"},{"start":"18:00","end":"02:00","price":"30000"},{"start":"02:00","end":"10:00","price":"30000"}]},{"categoryId":3,"basePrice":0,"timeSlots":[{"start":"10:00","end":"17:00","price":"20000"},{"start":"17:00","end":"02:00","price":"25000"},{"start":"02:00","end":"10:00","price":"25000"}]}]	\N	\N	2026-06-14 14:46:18.575865
300	BILLIARD_PRICE_OVERRIDE	kasir1	Ubah harga billiard manual dari Rp 40,000 ke Rp 60,000	6	TAB-260614144217	2026-06-14 14:47:37.211443
301	EXTEND_SESSION	kasir1	Tambah waktu meja MEJA 6 selama 60 menit. Tambahan biaya: Rp 20,000	6	\N	2026-06-14 14:47:37.506083
302	START_SESSION	kasir1	Mulai meja MEJA 8 (1 JAM WEEKEND) - Tamu: IMAN	8	\N	2026-06-14 15:05:48.096509
303	ADD_MENU	kasir1	Menambahkan 2x TARO ke MEJA 8	8	\N	2026-06-14 15:06:27.167324
304	STOP_SESSION	Sistem (Auto-Cutoff Prepaid)	Stop sesi meja MEJA 2. Durasi: 120 menit. Total Billiard: Rp 40,000 | Cafe: Rp 17,000 | SC: Rp 0 | PPN: Rp 0 | Grand Total: Rp 57,000 | Item Cafe: 1.000x WATER LEMON SPRITE, 1.000x AIR MINERAL	2	\N	2026-06-14 15:22:04.688386
305	START_SESSION	kasir1	Mulai meja MEJA 9 (1 JAM WEEKEND) - Tamu: SAMSUL	9	\N	2026-06-14 15:31:59.103118
306	BILLIARD_PRICE_OVERRIDE	kasir1	Ubah harga billiard manual dari Rp 25,000 ke Rp 50,000	9	TAB-260614153158	2026-06-14 15:32:08.53833
307	EXTEND_SESSION	kasir1	Tambah waktu meja MEJA 9 selama 60 menit. Tambahan biaya: Rp 25,000	9	\N	2026-06-14 15:32:08.619775
308	BILLIARD_PRICE_OVERRIDE	kasir1	Ubah harga billiard manual dari Rp 50,000 ke Rp 75,000	9	TAB-260614153158	2026-06-14 15:32:15.533349
309	EXTEND_SESSION	kasir1	Tambah waktu meja MEJA 9 selama 60 menit. Tambahan biaya: Rp 25,000	9	\N	2026-06-14 15:32:15.614659
310	ADD_MENU	kasir1	Menambahkan 1x KOPI HITAM ke MEJA 9	9	\N	2026-06-14 15:32:31.664335
311	ADD_MENU	kasir1	Menambahkan 1x ICE TEA (FREE) ke MEJA 9	9	\N	2026-06-14 15:36:24.511074
313	STOP_SESSION	Sistem (Auto-Cutoff Prepaid)	Stop sesi meja MEJA 8. Durasi: 60 menit. Total Billiard: Rp 20,000 | Cafe: Rp 30,000 | SC: Rp 0 | PPN: Rp 0 | Grand Total: Rp 50,000 | Item Cafe: 2.000x TARO	8	\N	2026-06-14 16:05:48.309498
314	START_SESSION	kasir1	Mulai meja MEJA 2 (1 JAM WEEKEND) - Tamu: KOCO	2	\N	2026-06-14 16:11:38.811441
315	BILLIARD_PRICE_OVERRIDE	kasir1	Ubah harga billiard manual dari Rp 20,000 ke Rp 50,000	2	TAB-260614161138	2026-06-14 16:12:14.298104
316	EXTEND_SESSION	kasir1	Tambah waktu meja MEJA 2 selama 60 menit. Tambahan biaya: Rp 30,000	2	\N	2026-06-14 16:12:14.415617
317	BILLIARD_PRICE_OVERRIDE	kasir1	Ubah harga billiard manual dari Rp 20,000 ke Rp 44,000	4	TAB-260614141557	2026-06-14 16:27:56.232834
318	STOP_SESSION	kasir1	Stop sesi meja MEJA 4. Durasi: 132 menit. Total Billiard: Rp 44,000 | Cafe: Rp 23,000 | SC: Rp 0 | PPN: Rp 0 | Grand Total: Rp 67,000 | Item Cafe: 1.000x ICE TEA, 1.000x AIR MINERAL, 1.000x LEMON TEA	4	\N	2026-06-14 16:27:56.422228
319	STOP_SESSION	Sistem (Auto-Cutoff Prepaid)	Stop sesi meja MEJA 5. Durasi: 180 menit. Total Billiard: Rp 55,000 | Cafe: Rp 6,000 | SC: Rp 0 | PPN: Rp 0 | Grand Total: Rp 61,000 | Item Cafe: 1.000x AIR MINERAL, 1.000x ICE TEA (FREE)	5	\N	2026-06-14 17:02:35.07145
320	ADD_MENU	kasir2	Menambahkan 1x YOU C 1000 ke 1	1	\N	2026-06-14 17:34:47.703496
321	STOP_SESSION	Sistem (Auto-Cutoff Prepaid)	Stop sesi meja MEJA 6. Durasi: 180 menit. Total Billiard: Rp 60,000 | Cafe: Rp 0 | SC: Rp 0 | PPN: Rp 0 | Grand Total: Rp 60,000 | Item Cafe: 1.000x ICE TEA (FREE)	6	\N	2026-06-14 17:42:19.010803
322	BILLIARD_PRICE_OVERRIDE	kasir2	Ubah harga billiard manual dari Rp 20,000 ke Rp 133,167	1	TAB-260614115549	2026-06-14 18:03:49.666244
323	STOP_SESSION	kasir2	Stop sesi meja MEJA 1. Durasi: 368 menit. Total Billiard: Rp 133,167 | Cafe: Rp 50,000 | SC: Rp 0 | PPN: Rp 0 | Grand Total: Rp 183,200 | Item Cafe: 2.000x AIR MINERAL, 2.000x HOT AMERICANO, 1.000x COCA COLA	1	\N	2026-06-14 18:03:50.067156
324	STOP_SESSION	Sistem (Auto-Cutoff Prepaid)	Stop sesi meja MEJA 2. Durasi: 120 menit. Total Billiard: Rp 50,000 | Cafe: Rp 0 | SC: Rp 0 | PPN: Rp 0 | Grand Total: Rp 50,000	2	\N	2026-06-14 18:11:38.996252
325	START_SESSION	kasir2	Mulai meja MEJA 2 (1 JAM WEEKEND) - Tamu: DIMAS	2	\N	2026-06-14 18:19:46.654556
326	BILLIARD_PRICE_OVERRIDE	kasir2	Ubah harga billiard manual dari Rp 30,000 ke Rp 60,000	2	TAB-260614181946	2026-06-14 18:19:54.6474
327	EXTEND_SESSION	kasir2	Tambah waktu meja MEJA 2 selama 60 menit. Tambahan biaya: Rp 30,000	2	\N	2026-06-14 18:19:54.729024
328	ADD_MENU	kasir2	Menambahkan 1x KOPI HITAM ke MEJA 2	2	\N	2026-06-14 18:20:03.75543
329	START_SESSION	kasir2	Mulai meja MEJA 6 (3 JAM WEEKEND) - Tamu: SADA	6	\N	2026-06-14 18:26:23.890174
330	STOP_SESSION	Sistem (Auto-Cutoff Prepaid)	Stop sesi meja MEJA 9. Durasi: 180 menit. Total Billiard: Rp 75,000 | Cafe: Rp 20,000 | SC: Rp 0 | PPN: Rp 0 | Grand Total: Rp 95,000 | Item Cafe: 1.000x KOPI HITAM, 1.000x HOT TEA, 1.000x ICE TEA (FREE)	9	\N	2026-06-14 18:31:59.26333
331	ADD_MENU	kasir2	Menambahkan 2x AIR MINERAL ke MEJA 6	6	\N	2026-06-14 18:32:02.352503
332	ADD_MENU	kasir2	Menambahkan 1x KOPI SUSU ke MEJA 6	6	\N	2026-06-14 18:32:34.587636
333	ADD_MENU	kasir2	Menambahkan 1x ICE TEA (FREE) ke MEJA 6	6	\N	2026-06-14 18:32:45.121078
334	START_SESSION	kasir2	Mulai meja MEJA 9 (1 JAM WEEKEND) - Tamu: SAMSUL	9	\N	2026-06-14 18:34:54.249434
335	START_SESSION	kasir2	Mulai meja MEJA 10 (1 JAM WEEKEND) - Tamu: MAULANA	10	\N	2026-06-14 18:37:30.827319
336	BILLIARD_PRICE_OVERRIDE	kasir2	Ubah harga billiard manual dari Rp 35,000 ke Rp 70,000	10	TAB-260614183730	2026-06-14 18:37:54.101639
337	EXTEND_SESSION	kasir2	Tambah waktu meja MEJA 10 selama 60 menit. Tambahan biaya: Rp 35,000	10	\N	2026-06-14 18:37:54.242847
338	ADD_MENU	kasir2	Menambahkan 1x AIR MINERAL ke MEJA 10	10	\N	2026-06-14 18:38:03.07343
339	START_SESSION	kasir2	Mulai meja MEJA 1 (3 JAM WEEKEND) - Tamu: TEGAR	1	\N	2026-06-14 18:41:03.126951
340	START_SESSION	kasir2	Mulai meja MEJA 4 (1 JAM WEEKEND) - Tamu: YOFI	4	\N	2026-06-14 18:43:38.973103
341	BILLIARD_PRICE_OVERRIDE	kasir2	Ubah harga billiard manual dari Rp 30,000 ke Rp 60,000	4	TAB-260614184338	2026-06-14 18:43:46.662614
342	EXTEND_SESSION	kasir2	Tambah waktu meja MEJA 4 selama 60 menit. Tambahan biaya: Rp 30,000	4	\N	2026-06-14 18:43:47.502901
343	ADD_MENU	kasir2	Menambahkan 1x ICE TEA (FREE) ke MEJA 1	1	\N	2026-06-14 18:55:07.195451
344	ADD_MENU	kasir2	Menambahkan 2x ICE TEA ke MEJA 1	1	\N	2026-06-14 18:55:22.678719
345	ADD_MENU	kasir2	Menambahkan 1x LYCHEE TEA ke MEJA 1	1	\N	2026-06-14 18:55:34.965478
346	ADD_MENU	kasir2	Menambahkan 1x AIR MINERAL ke MEJA 1	1	\N	2026-06-14 18:55:44.616736
347	ADD_MENU	kasir2	Menambahkan 1x AIR MINERAL ke MEJA 4	4	\N	2026-06-14 18:56:27.171947
348	ADD_MENU	kasir2	Menambahkan 1x KOPI SUSU ke MEJA 4	4	\N	2026-06-14 18:57:03.154427
349	ADD_MENU	kasir2	Menambahkan 1x BUBLE GUM/PERMEN KARET ke MEJA 4	4	\N	2026-06-14 18:57:15.944168
350	START_SESSION	kasir2	Mulai meja MEJA 5 (1 JAM WEEKEND) - Tamu: REZA	5	\N	2026-06-14 19:00:02.319823
351	BILLIARD_PRICE_OVERRIDE	kasir2	Ubah harga billiard manual dari Rp 30,000 ke Rp 60,000	5	TAB-260614190002	2026-06-14 19:00:14.073077
352	EXTEND_SESSION	kasir2	Tambah waktu meja MEJA 5 selama 60 menit. Tambahan biaya: Rp 30,000	5	\N	2026-06-14 19:00:14.24026
353	ADD_MENU	kasir2	Menambahkan 3x AIR MINERAL ke MEJA 5	5	\N	2026-06-14 19:00:27.250338
354	ADD_MENU	kasir2	Menambahkan 1x ICE TEA ke MEJA 2	2	\N	2026-06-14 19:14:20.945916
355	ADD_MENU	kasir2	Menambahkan 1x KOPI SUSU ke MEJA 4	4	\N	2026-06-14 19:14:30.782096
356	START_SESSION	kasir2	Mulai meja MEJA 3 (1 JAM WEEKEND) - Tamu: FEBRI	3	\N	2026-06-14 19:18:45.827675
357	ADD_MENU	kasir2	Menambahkan 1x RED VELVET ke MEJA 2	2	\N	2026-06-14 19:18:56.733238
358	START_SESSION	kasir2	Mulai meja MEJA 7 (3 JAM WEEKEND) - Tamu: ANDRI	7	\N	2026-06-14 19:25:57.896815
359	ADD_MENU	kasir2	Menambahkan 1x ICE TEA (FREE) ke MEJA 7	7	\N	2026-06-14 19:26:08.092324
360	ADD_MENU	kasir2	Menambahkan 1x PANDAN COFFE ke MEJA 7	7	\N	2026-06-14 19:26:18.638469
361	ADD_MENU	kasir2	Menambahkan 1x HOT AMERICANO ke MEJA 7	7	\N	2026-06-14 19:26:28.535681
362	ADD_MENU	kasir2	Menambahkan 1x TEMPE KEMUL ke MEJA 7	7	\N	2026-06-14 19:26:40.729812
363	ADD_MENU	kasir2	Menambahkan 1x RED VELVET ke MEJA 3	3	\N	2026-06-14 19:34:51.430897
364	STOP_SESSION	Sistem (Auto-Cutoff Prepaid)	Stop sesi meja MEJA 9. Durasi: 60 menit. Total Billiard: Rp 35,000 | Cafe: Rp 0 | SC: Rp 0 | PPN: Rp 0 | Grand Total: Rp 35,000	9	\N	2026-06-14 19:34:55.023475
365	ADD_MENU	kasir2	Menambahkan 1x LYCHEE TEA ke MEJA 3	3	\N	2026-06-14 19:47:31.873455
366	ADD_MENU	kasir2	Menambahkan 1x KOPI GULA AREN ke MEJA 3	3	\N	2026-06-14 19:47:50.598238
369	ADD_MENU	kasir2	Menambahkan 2x LYCHEE TEA ke MEJA 2	2	\N	2026-06-14 20:01:40.008567
367	STOP_SESSION	kasir2	Stop sesi meja MEJA 2. Durasi: 97 menit. Total Billiard: Rp 60,000 | Cafe: Rp 32,000 | SC: Rp 0 | PPN: Rp 0 | Grand Total: Rp 92,000 | Item Cafe: 1.000x ICE TEA, 1.000x KOPI HITAM, 1.000x RED VELVET	2	\N	2026-06-14 19:56:39.06918
368	START_SESSION	kasir2	Mulai meja MEJA 2 (OPEN TABLE WEEKEND) - Tamu: GILANG	2	\N	2026-06-14 20:01:04.787922
370	BILLIARD_PRICE_OVERRIDE	kasir2	Ubah harga billiard manual dari Rp 30,000 ke Rp 60,000	3	TAB-260614191845	2026-06-14 20:16:26.274915
371	EXTEND_SESSION	kasir2	Tambah waktu meja MEJA 3 selama 60 menit. Tambahan biaya: Rp 30,000	3	\N	2026-06-14 20:16:26.440094
372	STOP_SESSION	Sistem (Auto-Cutoff Prepaid)	Stop sesi meja MEJA 10. Durasi: 120 menit. Total Billiard: Rp 70,000 | Cafe: Rp 6,000 | SC: Rp 0 | PPN: Rp 0 | Grand Total: Rp 76,000 | Item Cafe: 1.000x AIR MINERAL	10	\N	2026-06-14 20:37:30.950108
373	START_SESSION	kasir2	Mulai meja MEJA 8 (1 JAM WEEKEND) - Tamu: SIBI	8	\N	2026-06-14 20:40:47.07839
374	BILLIARD_PRICE_OVERRIDE	kasir2	Ubah harga billiard manual dari Rp 30,000 ke Rp 60,000	8	TAB-260614204046	2026-06-14 20:40:52.182637
375	EXTEND_SESSION	kasir2	Tambah waktu meja MEJA 8 selama 60 menit. Tambahan biaya: Rp 30,000	8	\N	2026-06-14 20:40:52.543602
376	STOP_SESSION	Sistem (Auto-Cutoff Prepaid)	Stop sesi meja MEJA 4. Durasi: 120 menit. Total Billiard: Rp 60,000 | Cafe: Rp 41,000 | SC: Rp 0 | PPN: Rp 0 | Grand Total: Rp 101,000 | Item Cafe: 1.000x AIR MINERAL, 1.000x KOPI SUSU, 1.000x KOPI SUSU, 1.000x BUBLE GUM/PERMEN KARET	4	\N	2026-06-14 20:43:41.702389
377	START_SESSION	kasir2	Mulai meja MEJA 4 (1 JAM WEEKEND) - Tamu: YOFI	4	\N	2026-06-14 20:45:29.641001
378	BILLIARD_PRICE_OVERRIDE	kasir2	Ubah harga billiard manual dari Rp 30,000 ke Rp 60,000	4	TAB-260614204529	2026-06-14 20:45:34.193486
379	EXTEND_SESSION	kasir2	Tambah waktu meja MEJA 4 selama 60 menit. Tambahan biaya: Rp 30,000	4	\N	2026-06-14 20:45:34.559017
380	STOP_SESSION	Sistem (Auto-Cutoff Prepaid)	Stop sesi meja MEJA 5. Durasi: 120 menit. Total Billiard: Rp 60,000 | Cafe: Rp 18,000 | SC: Rp 0 | PPN: Rp 0 | Grand Total: Rp 78,000 | Item Cafe: 3.000x AIR MINERAL	5	\N	2026-06-14 21:00:03.108241
381	START_SESSION	kasir2	Mulai meja MEJA 5 (3 JAM WEEKEND) - Tamu: ANDRE	5	\N	2026-06-14 21:02:14.630513
382	ADD_MENU	kasir2	Menambahkan 1x ICE TEA (FREE) ke MEJA 5	5	\N	2026-06-14 21:02:23.744403
383	ADD_MENU	kasir2	Menambahkan 1x GREEN SAND ke MEJA 5	5	\N	2026-06-14 21:02:36.255215
384	ADD_MENU	kasir2	Menambahkan 1x WATER LEMON SPRITE ke MEJA 5	5	\N	2026-06-14 21:02:45.251365
385	STOP_SESSION	Sistem (Auto-Cutoff Prepaid)	Stop sesi meja MEJA 3. Durasi: 120 menit. Total Billiard: Rp 60,000 | Cafe: Rp 40,000 | SC: Rp 0 | PPN: Rp 0 | Grand Total: Rp 100,000 | Item Cafe: 1.000x KOPI GULA AREN, 1.000x RED VELVET, 1.000x LYCHEE TEA	3	\N	2026-06-14 21:18:45.992681
386	STOP_SESSION	Sistem (Auto-Cutoff Prepaid)	Stop sesi meja MEJA 6. Durasi: 180 menit. Total Billiard: Rp 85,000 | Cafe: Rp 22,000 | SC: Rp 0 | PPN: Rp 0 | Grand Total: Rp 107,000 | Item Cafe: 2.000x AIR MINERAL, 1.000x KOPI SUSU, 1.000x ICE TEA (FREE)	6	\N	2026-06-14 21:26:24.023741
387	ADD_MENU	kasir2	Menambahkan 1x AIR MINERAL ke MEJA 4	4	\N	2026-06-14 21:27:50.675646
388	BILLIARD_PRICE_OVERRIDE	kasir2	Ubah harga billiard manual dari Rp 30,000 ke Rp 46,000	2	TAB-260614200104	2026-06-14 21:32:47.39602
389	STOP_SESSION	kasir2	Stop sesi meja MEJA 2. Durasi: 92 menit. Total Billiard: Rp 46,000 | Cafe: Rp 20,000 | SC: Rp 0 | PPN: Rp 0 | Grand Total: Rp 66,000 | Item Cafe: 2.000x LYCHEE TEA	2	\N	2026-06-14 21:32:47.611408
390	STOP_SESSION	Sistem (Auto-Cutoff Prepaid)	Stop sesi meja MEJA 1. Durasi: 180 menit. Total Billiard: Rp 85,000 | Cafe: Rp 30,000 | SC: Rp 0 | PPN: Rp 0 | Grand Total: Rp 115,000 | Item Cafe: 2.000x ICE TEA, 1.000x AIR MINERAL, 1.000x LYCHEE TEA, 1.000x ICE TEA (FREE)	1	\N	2026-06-14 21:41:03.397539
391	START_SESSION	kasir2	Mulai meja MEJA 2 (OPEN TABLE WEEKEND) - Tamu: ATTA	2	\N	2026-06-14 22:00:20.353439
392	START_SESSION	kasir2	Mulai meja MEJA 12 (OPEN TABLE WEEKEND) - Tamu: ?	12	\N	2026-06-14 22:00:38.106361
393	START_SESSION	kasir2	Mulai meja MEJA 3 (1 JAM WEEKEND) - Tamu: NOFAL	3	\N	2026-06-14 22:01:44.118646
394	ADD_MENU	kasir2	Menambahkan 1x HOT TEA ke MEJA 3	3	\N	2026-06-14 22:05:07.488062
395	ADD_MENU	kasir2	Menambahkan 2x ICE TEA ke MEJA 3	3	\N	2026-06-14 22:05:24.195485
396	ADD_MENU	kasir2	Menambahkan 1x LEMON TEA ke MEJA 2	2	\N	2026-06-14 22:15:47.300415
397	STOP_SESSION	Sistem (Auto-Cutoff Prepaid)	Stop sesi meja MEJA 7. Durasi: 180 menit. Total Billiard: Rp 85,000 | Cafe: Rp 42,000 | SC: Rp 0 | PPN: Rp 0 | Grand Total: Rp 127,000 | Item Cafe: 1.000x HOT AMERICANO, 1.000x PANDAN COFFE, 1.000x TEMPE KEMUL, 1.000x ICE TEA (FREE)	7	\N	2026-06-14 22:25:58.005495
398	START_SESSION	kasir2	Mulai meja MEJA 7 (1 JAM WEEKEND) - Tamu: ADIT	7	\N	2026-06-14 22:36:49.769065
399	BILLIARD_PRICE_OVERRIDE	kasir2	Ubah harga billiard manual dari Rp 30,000 ke Rp 60,000	7	TAB-260614223649	2026-06-14 22:37:03.983707
400	EXTEND_SESSION	kasir2	Tambah waktu meja MEJA 7 selama 60 menit. Tambahan biaya: Rp 30,000	7	\N	2026-06-14 22:37:04.060027
401	ADD_MENU	kasir2	Menambahkan 2x ICE TEA ke MEJA 7	7	\N	2026-06-14 22:37:13.0782
402	STOP_SESSION	Sistem (Auto-Cutoff Prepaid)	Stop sesi meja MEJA 8. Durasi: 120 menit. Total Billiard: Rp 60,000 | Cafe: Rp 0 | SC: Rp 0 | PPN: Rp 0 | Grand Total: Rp 60,000	8	\N	2026-06-14 22:40:47.458561
403	STOP_SESSION	Sistem (Auto-Cutoff Prepaid)	Stop sesi meja MEJA 4. Durasi: 120 menit. Total Billiard: Rp 60,000 | Cafe: Rp 6,000 | SC: Rp 0 | PPN: Rp 0 | Grand Total: Rp 66,000 | Item Cafe: 1.000x AIR MINERAL	4	\N	2026-06-14 22:45:30.200126
404	STOP_SESSION	kasir2	Stop sesi meja MEJA 12. Durasi: 60 menit. Total Billiard: Rp 45,000 | Cafe: Rp 0 | SC: Rp 0 | PPN: Rp 0 | Grand Total: Rp 45,000	12	\N	2026-06-14 23:00:13.509988
405	STOP_SESSION	Sistem (Auto-Cutoff Prepaid)	Stop sesi meja MEJA 3. Durasi: 60 menit. Total Billiard: Rp 30,000 | Cafe: Rp 24,000 | SC: Rp 0 | PPN: Rp 0 | Grand Total: Rp 54,000 | Item Cafe: 2.000x ICE TEA, 1.000x HOT TEA	3	\N	2026-06-14 23:01:46.935694
406	START_SESSION	kasir2	Mulai meja MEJA 12 (1 JAM WEEKEND ) - Tamu: ?	12	\N	2026-06-14 23:02:02.752309
407	START_SESSION	kasir2	Mulai meja MEJA 4 (1 JAM WEEKEND) - Tamu: JON	4	\N	2026-06-14 23:05:16.361333
408	BILLIARD_PRICE_OVERRIDE	kasir2	Ubah harga billiard manual dari Rp 30,000 ke Rp 60,000	4	TAB-260614230515	2026-06-14 23:05:26.706245
409	EXTEND_SESSION	kasir2	Tambah waktu meja MEJA 4 selama 60 menit. Tambahan biaya: Rp 30,000	4	\N	2026-06-14 23:05:26.862955
410	ADD_MENU	kasir2	Menambahkan 1x AMERICANO ICE ke MEJA 4	4	\N	2026-06-14 23:05:35.860374
411	ADD_MENU	kasir2	Menambahkan 1x RICH CHOCO ke MEJA 12	12	\N	2026-06-14 23:27:17.402698
412	ADD_MENU	kasir2	Menambahkan 1x LYCHEE TEA ke MEJA 12	12	\N	2026-06-14 23:27:26.279879
413	START_SESSION	kasir2	Mulai meja MEJA 10 (1 JAM WEEKEND) - Tamu: REYHAN	10	\N	2026-06-14 23:37:17.790271
414	BILLIARD_PRICE_OVERRIDE	kasir2	Ubah harga billiard manual dari Rp 35,000 ke Rp 70,000	10	TAB-260614233717	2026-06-14 23:37:29.6674
415	EXTEND_SESSION	kasir2	Tambah waktu meja MEJA 10 selama 60 menit. Tambahan biaya: Rp 35,000	10	\N	2026-06-14 23:37:29.760658
416	ADD_MENU	kasir2	Menambahkan 1x NUGGET ke MEJA 10	10	\N	2026-06-14 23:37:36.613077
417	ADD_MENU	kasir2	Menambahkan 1x AIR MINERAL ke MEJA 10	10	\N	2026-06-14 23:38:08.414448
418	ADD_MENU	kasir2	Menambahkan 1x CINCAU CAP PANDA ke MEJA 10	10	\N	2026-06-14 23:38:21.246074
419	STOP_SESSION	Sistem (Auto-Cutoff Prepaid)	Stop sesi meja MEJA 12. Durasi: 60 menit. Total Billiard: Rp 45,000 | Cafe: Rp 25,000 | SC: Rp 0 | PPN: Rp 0 | Grand Total: Rp 70,000 | Item Cafe: 1.000x RICH CHOCO, 1.000x LYCHEE TEA	12	\N	2026-06-15 00:02:03.372812
420	STOP_SESSION	Sistem (Auto-Cutoff Prepaid)	Stop sesi meja MEJA 5. Durasi: 180 menit. Total Billiard: Rp 85,000 | Cafe: Rp 21,000 | SC: Rp 0 | PPN: Rp 0 | Grand Total: Rp 106,000 | Item Cafe: 1.000x GREEN SAND, 1.000x WATER LEMON SPRITE, 1.000x ICE TEA (FREE)	5	\N	2026-06-15 00:02:14.759341
421	UPDATE_SETTINGS	kasir2	Ubah pengaturan: customPricingDynamic: [{"categoryId":1,"basePrice":0,"timeSlots":[{"start":"10:00","end":"18:00","price":35000},{"start":"18:00","end":"02:00","price":"40000"},{"start":"02:00","end":"10:00","price":"40000"}]},{"categoryId":2,"basePrice":0,"timeSlots":[{"start":"10:00","end":"18:00","price":"25000"},{"start":"18:00","end":"02:00","price":"30000"},{"start":"02:00","end":"10:00","price":"30000"}]},{"categoryId":3,"basePrice":0,"timeSlots":[{"start":"10:00","end":"17:00","price":"20000"},{"start":"17:00","end":"02:00","price":"25000"},{"start":"02:00","end":"10:00","price":"25000"}]}] -> [{"categoryId":1,"basePrice":0,"timeSlots":[{"start":"10:00","end":"18:00","price":35000},{"start":"18:00","end":"02:00","price":"45000"},{"start":"02:00","end":"10:00","price":"45000"}]},{"categoryId":2,"basePrice":0,"timeSlots":[{"start":"10:00","end":"18:00","price":"25000"},{"start":"18:00","end":"02:00","price":"30000"},{"start":"02:00","end":"10:00","price":"30000"}]},{"categoryId":3,"basePrice":0,"timeSlots":[{"start":"10:00","end":"17:00","price":"20000"},{"start":"17:00","end":"02:00","price":"25000"},{"start":"02:00","end":"10:00","price":"25000"}]}]	\N	\N	2026-06-15 00:16:44.018349
422	UPDATE_SETTINGS	kasir2	Ubah pengaturan: customPricingDynamic: [{"categoryId":1,"basePrice":0,"timeSlots":[{"start":"10:00","end":"18:00","price":35000},{"start":"18:00","end":"02:00","price":"45000"},{"start":"02:00","end":"10:00","price":"45000"}]},{"categoryId":2,"basePrice":0,"timeSlots":[{"start":"10:00","end":"18:00","price":"25000"},{"start":"18:00","end":"02:00","price":"30000"},{"start":"02:00","end":"10:00","price":"30000"}]},{"categoryId":3,"basePrice":0,"timeSlots":[{"start":"10:00","end":"17:00","price":"20000"},{"start":"17:00","end":"02:00","price":"25000"},{"start":"02:00","end":"10:00","price":"25000"}]}] -> [{"categoryId":1,"basePrice":0,"timeSlots":[{"start":"10:00","end":"18:00","price":35000},{"start":"18:00","end":"02:00","price":"45000"},{"start":"02:00","end":"10:00","price":"45000"}]},{"categoryId":2,"basePrice":0,"timeSlots":[{"start":"10:00","end":"18:00","price":"25000"},{"start":"18:00","end":"02:00","price":"30000"},{"start":"02:00","end":"10:00","price":"30000"}]},{"categoryId":3,"basePrice":0,"timeSlots":[{"start":"10:00","end":"17:00","price":"20000"},{"start":"17:00","end":"02:00","price":"30000"},{"start":"02:00","end":"10:00","price":"30000"}]}]	\N	\N	2026-06-15 00:17:05.342453
423	START_SESSION	kasir2	Mulai meja MEJA 3 (Custom Session) - Tamu: nopal	3	\N	2026-06-15 00:19:12.637534
424	START_SESSION	kasir2	Mulai meja MEJA 11 (Custom Session) - Tamu: ...	11	\N	2026-06-15 00:19:46.845775
425	BILLIARD_PRICE_OVERRIDE	kasir2	Ubah harga billiard manual dari Rp 30,000 ke Rp 73,500	2	TAB-260614220019	2026-06-15 00:26:25.64647
426	STOP_SESSION	kasir2	Stop sesi meja MEJA 2. Durasi: 146 menit. Total Billiard: Rp 73,500 | Cafe: Rp 10,000 | SC: Rp 0 | PPN: Rp 0 | Grand Total: Rp 83,500 | Item Cafe: 1.000x LEMON TEA	2	\N	2026-06-15 00:26:25.79248
427	STOP_SESSION	Sistem (Auto-Cutoff Prepaid)	Stop sesi meja MEJA 7. Durasi: 120 menit. Total Billiard: Rp 60,000 | Cafe: Rp 14,000 | SC: Rp 0 | PPN: Rp 0 | Grand Total: Rp 74,000 | Item Cafe: 2.000x ICE TEA	7	\N	2026-06-15 00:36:49.830313
428	STOP_SESSION	kasir2	Stop sesi meja MEJA 4. Durasi: 102 menit. Total Billiard: Rp 60,000 | Cafe: Rp 15,000 | SC: Rp 0 | PPN: Rp 0 | Grand Total: Rp 75,000 | Item Cafe: 1.000x AMERICANO ICE	4	\N	2026-06-15 00:46:56.657123
429	START_SESSION	kasir2	Mulai meja MEJA 4 (Custom Session) - Tamu: jon	4	\N	2026-06-15 00:49:05.943079
430	START_SESSION	kasir2	Mulai meja MEJA 1 (Custom Session) - Tamu: jokowi	1	\N	2026-06-15 01:13:44.926368
431	STOP_SESSION	Sistem (Auto-Cutoff Prepaid)	Stop sesi meja MEJA 3. Durasi: 60 menit. Total Billiard: Rp 30,000 | Cafe: Rp 0 | SC: Rp 0 | PPN: Rp 0 | Grand Total: Rp 30,000	3	\N	2026-06-15 01:19:13.116596
432	UPDATE_SETTINGS	0	Ubah pengaturan: availablePaymentMethods: ["CASH","Qris","TRANSFER","GoPay","DANA","OVO","BCA","MANDIRI","BRI","BNI","SEABANK","SHOPEEPAY"] -> ["CASH","Qris","TRANSFER","GoPay","DANA","OVO","BCA","MANDIRI","BRI","BNI","SEABANK","SHOPEEPAY"], invoiceFooterNote: "Periksa kembali nota anda, kami tidak menerima komplain \\nsaat anda meningalkan area ini" -> "Periksa kembali nota anda, kami tidak menerima komplain \\nsaat anda meninggalkan area ini. Terima kasih\\n\\n\\n\\nSupport system \\n08-9999-64538", customPricingDynamic: [{"categoryId":1,"basePrice":0,"timeSlots":[{"start":"10:00","end":"18:00","price":35000},{"start":"18:00","end":"02:00","price":"45000"},{"start":"02:00","end":"10:00","price":"45000"}]},{"categoryId":2,"basePrice":0,"timeSlots":[{"start":"10:00","end":"18:00","price":"25000"},{"start":"18:00","end":"02:00","price":"30000"},{"start":"02:00","end":"10:00","price":"30000"}]},{"categoryId":3,"basePrice":0,"timeSlots":[{"start":"10:00","end":"17:00","price":"20000"},{"start":"17:00","end":"02:00","price":"30000"},{"start":"02:00","end":"10:00","price":"30000"}]}] -> [{"categoryId":1,"basePrice":0,"timeSlots":[{"start":"10:00","end":"18:00","price":35000},{"start":"18:00","end":"02:00","price":"45000"},{"start":"02:00","end":"10:00","price":"45000"}]},{"categoryId":2,"basePrice":0,"timeSlots":[{"start":"10:00","end":"18:00","price":"25000"},{"start":"18:00","end":"02:00","price":"30000"},{"start":"02:00","end":"10:00","price":"30000"}]},{"categoryId":3,"basePrice":0,"timeSlots":[{"start":"10:00","end":"17:00","price":"20000"},{"start":"17:00","end":"02:00","price":"30000"},{"start":"02:00","end":"10:00","price":"30000"}]}], availableShifts: [{"name":"SHIFT 1","startTime":"10:00","endTime":"18:00"},{"name":"SHIFT 2","startTime":"18:00","endTime":"02:00"},{"name":"OVERTIME","startTime":"02:00","endTime":"10:00"}] -> [{"name":"SHIFT 1","startTime":"10:00","endTime":"18:00"},{"name":"SHIFT 2","startTime":"18:00","endTime":"02:00"},{"name":"OVERTIME","startTime":"02:00","endTime":"10:00"}], approvalConfig: {"WASTE":[1,2],"EXPENSE":[1,2],"STOCK_UPDATE":[1,2],"PENALTY":[1,2],"CLOSING":[1,2],"DATA_EDIT":[1,2]} -> {"WASTE":[1,2],"EXPENSE":[1,2],"STOCK_UPDATE":[1,2],"PENALTY":[1,2],"CLOSING":[1,2],"DATA_EDIT":[1,2]}, bounceBackConfig: [{"tierName":"Tier 1 - Pelanggan Reguler","minAmount":5000000,"maxAmount":100000,"rewardType":"FREE_ITEM","rewardValue":1,"minClaimTransaction":0,"expiryDays":7},{"tierName":"Tier 2 - Pelanggan Setia","minAmount":10000000,"maxAmount":250000,"rewardType":"DISCOUNT_FIXED","rewardValue":15000,"minClaimTransaction":50000,"expiryDays":14},{"tierName":"Tier 3 - Pelanggan VIP","minAmount":20000000,"maxAmount":99999999,"rewardType":"FREE_BILLIARD_MINUTES","rewardValue":60,"minClaimTransaction":0,"expiryDays":30}] -> [{"tierName":"Tier 1 - Pelanggan Reguler","minAmount":5000000,"maxAmount":100000,"rewardType":"FREE_ITEM","rewardValue":1,"minClaimTransaction":0,"expiryDays":7},{"tierName":"Tier 2 - Pelanggan Setia","minAmount":10000000,"maxAmount":250000,"rewardType":"DISCOUNT_FIXED","rewardValue":15000,"minClaimTransaction":50000,"expiryDays":14},{"tierName":"Tier 3 - Pelanggan VIP","minAmount":20000000,"maxAmount":99999999,"rewardType":"FREE_BILLIARD_MINUTES","rewardValue":60,"minClaimTransaction":0,"expiryDays":30}]	\N	\N	2026-06-15 01:22:49.053065
433	UPDATE_SETTINGS	0	Ubah pengaturan: availablePaymentMethods: ["CASH","Qris","TRANSFER","GoPay","DANA","OVO","BCA","MANDIRI","BRI","BNI","SEABANK","SHOPEEPAY"] -> ["CASH","Qris","TRANSFER","GoPay","DANA","OVO","BCA","MANDIRI","BRI","BNI","SEABANK","SHOPEEPAY"], invoiceFooterNote: "Periksa kembali nota anda, kami tidak menerima komplain \\nsaat anda meninggalkan area ini. Terima kasih\\n\\n\\n\\nSupport system \\n08-9999-64538" -> "Periksa kembali nota anda, kami tidak menerima komplain \\nsaat anda meninggalkan area ini.", customPricingDynamic: [{"categoryId":1,"basePrice":0,"timeSlots":[{"start":"10:00","end":"18:00","price":35000},{"start":"18:00","end":"02:00","price":"45000"},{"start":"02:00","end":"10:00","price":"45000"}]},{"categoryId":2,"basePrice":0,"timeSlots":[{"start":"10:00","end":"18:00","price":"25000"},{"start":"18:00","end":"02:00","price":"30000"},{"start":"02:00","end":"10:00","price":"30000"}]},{"categoryId":3,"basePrice":0,"timeSlots":[{"start":"10:00","end":"17:00","price":"20000"},{"start":"17:00","end":"02:00","price":"30000"},{"start":"02:00","end":"10:00","price":"30000"}]}] -> [{"categoryId":1,"basePrice":0,"timeSlots":[{"start":"10:00","end":"18:00","price":35000},{"start":"18:00","end":"02:00","price":"45000"},{"start":"02:00","end":"10:00","price":"45000"}]},{"categoryId":2,"basePrice":0,"timeSlots":[{"start":"10:00","end":"18:00","price":"25000"},{"start":"18:00","end":"02:00","price":"30000"},{"start":"02:00","end":"10:00","price":"30000"}]},{"categoryId":3,"basePrice":0,"timeSlots":[{"start":"10:00","end":"17:00","price":"20000"},{"start":"17:00","end":"02:00","price":"30000"},{"start":"02:00","end":"10:00","price":"30000"}]}], availableShifts: [{"name":"SHIFT 1","startTime":"10:00","endTime":"18:00"},{"name":"SHIFT 2","startTime":"18:00","endTime":"02:00"},{"name":"OVERTIME","startTime":"02:00","endTime":"10:00"}] -> [{"name":"SHIFT 1","startTime":"10:00","endTime":"18:00"},{"name":"SHIFT 2","startTime":"18:00","endTime":"02:00"},{"name":"OVERTIME","startTime":"02:00","endTime":"10:00"}], approvalConfig: {"WASTE":[1,2],"EXPENSE":[1,2],"STOCK_UPDATE":[1,2],"PENALTY":[1,2],"CLOSING":[1,2],"DATA_EDIT":[1,2]} -> {"WASTE":[1,2],"EXPENSE":[1,2],"STOCK_UPDATE":[1,2],"PENALTY":[1,2],"CLOSING":[1,2],"DATA_EDIT":[1,2]}, bounceBackConfig: [{"tierName":"Tier 1 - Pelanggan Reguler","minAmount":5000000,"maxAmount":100000,"rewardType":"FREE_ITEM","rewardValue":1,"minClaimTransaction":0,"expiryDays":7},{"tierName":"Tier 2 - Pelanggan Setia","minAmount":10000000,"maxAmount":250000,"rewardType":"DISCOUNT_FIXED","rewardValue":15000,"minClaimTransaction":50000,"expiryDays":14},{"tierName":"Tier 3 - Pelanggan VIP","minAmount":20000000,"maxAmount":99999999,"rewardType":"FREE_BILLIARD_MINUTES","rewardValue":60,"minClaimTransaction":0,"expiryDays":30}] -> [{"tierName":"Tier 1 - Pelanggan Reguler","minAmount":5000000,"maxAmount":100000,"rewardType":"FREE_ITEM","rewardValue":1,"minClaimTransaction":0,"expiryDays":7},{"tierName":"Tier 2 - Pelanggan Setia","minAmount":10000000,"maxAmount":250000,"rewardType":"DISCOUNT_FIXED","rewardValue":15000,"minClaimTransaction":50000,"expiryDays":14},{"tierName":"Tier 3 - Pelanggan VIP","minAmount":20000000,"maxAmount":99999999,"rewardType":"FREE_BILLIARD_MINUTES","rewardValue":60,"minClaimTransaction":0,"expiryDays":30}]	\N	\N	2026-06-15 01:23:25.268893
434	STOP_SESSION	Sistem (Auto-Cutoff Prepaid)	Stop sesi meja MEJA 10. Durasi: 120 menit. Total Billiard: Rp 70,000 | Cafe: Rp 30,000 | SC: Rp 0 | PPN: Rp 0 | Grand Total: Rp 100,000 | Item Cafe: 1.000x CINCAU CAP PANDA, 1.000x NUGGET, 1.000x AIR MINERAL	10	\N	2026-06-15 01:37:17.799136
435	BILLIARD_PRICE_OVERRIDE	kasir2	Ubah harga billiard manual dari Rp 45,000 ke Rp 75,000	4	TAB-260614004905	2026-06-15 02:14:49.609566
436	EXTEND_SESSION	kasir2	Tambah waktu meja MEJA 4 selama 60 menit. Tambahan biaya: Rp 30,000	4	\N	2026-06-15 02:14:49.688765
437	STOP_SESSION	Sistem (Auto-Cutoff Prepaid)	Stop sesi meja MEJA 11. Durasi: 120 menit. Total Billiard: Rp 90,000 | Cafe: Rp 0 | SC: Rp 0 | PPN: Rp 0 | Grand Total: Rp 90,000	11	\N	2026-06-15 02:19:46.957637
438	STOP_SESSION	kasir2	Stop sesi meja MEJA 4. Durasi: 109 menit. Total Billiard: Rp 75,000 | Cafe: Rp 0 | SC: Rp 0 | PPN: Rp 0 | Grand Total: Rp 75,000	4	\N	2026-06-15 02:38:25.00479
439	UPDATE_SETTINGS	0	Ubah pengaturan: businessDayOffset: "03:00" -> "07:00", availablePaymentMethods: ["CASH","Qris","TRANSFER","GoPay","DANA","OVO","BCA","MANDIRI","BRI","BNI","SEABANK","SHOPEEPAY"] -> ["CASH","Qris","TRANSFER","GoPay","DANA","OVO","BCA","MANDIRI","BRI","BNI","SEABANK","SHOPEEPAY"], customPricingDynamic: [{"categoryId":1,"basePrice":0,"timeSlots":[{"start":"10:00","end":"18:00","price":35000},{"start":"18:00","end":"02:00","price":"45000"},{"start":"02:00","end":"10:00","price":"45000"}]},{"categoryId":2,"basePrice":0,"timeSlots":[{"start":"10:00","end":"18:00","price":"25000"},{"start":"18:00","end":"02:00","price":"30000"},{"start":"02:00","end":"10:00","price":"30000"}]},{"categoryId":3,"basePrice":0,"timeSlots":[{"start":"10:00","end":"17:00","price":"20000"},{"start":"17:00","end":"02:00","price":"30000"},{"start":"02:00","end":"10:00","price":"30000"}]}] -> [{"categoryId":1,"basePrice":0,"timeSlots":[{"start":"10:00","end":"18:00","price":35000},{"start":"18:00","end":"02:00","price":"45000"},{"start":"02:00","end":"10:00","price":"45000"}]},{"categoryId":2,"basePrice":0,"timeSlots":[{"start":"10:00","end":"18:00","price":"25000"},{"start":"18:00","end":"02:00","price":"30000"},{"start":"02:00","end":"10:00","price":"30000"}]},{"categoryId":3,"basePrice":0,"timeSlots":[{"start":"10:00","end":"17:00","price":"20000"},{"start":"17:00","end":"02:00","price":"30000"},{"start":"02:00","end":"10:00","price":"30000"}]}], availableShifts: [{"name":"SHIFT 1","startTime":"10:00","endTime":"18:00"},{"name":"SHIFT 2","startTime":"18:00","endTime":"02:00"},{"name":"OVERTIME","startTime":"02:00","endTime":"10:00"}] -> [{"name":"SHIFT 1","startTime":"10:00","endTime":"18:00"},{"name":"SHIFT 2","startTime":"18:00","endTime":"02:00"},{"name":"OVERTIME","startTime":"02:00","endTime":"10:00"}], approvalConfig: {"WASTE":[1,2],"EXPENSE":[1,2],"STOCK_UPDATE":[1,2],"PENALTY":[1,2],"CLOSING":[1,2],"DATA_EDIT":[1,2]} -> {"WASTE":[1,2],"EXPENSE":[1,2],"STOCK_UPDATE":[1,2],"PENALTY":[1,2],"CLOSING":[1,2],"DATA_EDIT":[1,2]}, bounceBackConfig: [{"tierName":"Tier 1 - Pelanggan Reguler","minAmount":5000000,"maxAmount":100000,"rewardType":"FREE_ITEM","rewardValue":1,"minClaimTransaction":0,"expiryDays":7},{"tierName":"Tier 2 - Pelanggan Setia","minAmount":10000000,"maxAmount":250000,"rewardType":"DISCOUNT_FIXED","rewardValue":15000,"minClaimTransaction":50000,"expiryDays":14},{"tierName":"Tier 3 - Pelanggan VIP","minAmount":20000000,"maxAmount":99999999,"rewardType":"FREE_BILLIARD_MINUTES","rewardValue":60,"minClaimTransaction":0,"expiryDays":30}] -> [{"tierName":"Tier 1 - Pelanggan Reguler","minAmount":5000000,"maxAmount":100000,"rewardType":"FREE_ITEM","rewardValue":1,"minClaimTransaction":0,"expiryDays":7},{"tierName":"Tier 2 - Pelanggan Setia","minAmount":10000000,"maxAmount":250000,"rewardType":"DISCOUNT_FIXED","rewardValue":15000,"minClaimTransaction":50000,"expiryDays":14},{"tierName":"Tier 3 - Pelanggan VIP","minAmount":20000000,"maxAmount":99999999,"rewardType":"FREE_BILLIARD_MINUTES","rewardValue":60,"minClaimTransaction":0,"expiryDays":30}]	\N	\N	2026-06-15 03:47:52.185333
585	ADD_MENU	kasir1	Menambahkan 2x AIR MINERAL ke MEJA 9	9	\N	2026-06-16 11:15:22.529457
440	STOP_SESSION	kasir2	Stop sesi meja MEJA 1. Durasi: 177 menit. Total Billiard: Rp 90,000 | Cafe: Rp 0 | SC: Rp 0 | PPN: Rp 0 | Grand Total: Rp 90,000	1	\N	2026-06-15 04:10:28.245693
441	START_SESSION	scuff	Mulai meja MEJA 4 (2 JAM WEEKDAYS) - Tamu: HUMAN	4	\N	2026-06-15 10:10:31.073465
442	START_SESSION	scuff	Mulai meja MEJA 2 (2 JAM WEEKDAYS) - Tamu: . 	2	\N	2026-06-15 10:19:17.719122
443	ADD_MENU	kasir2	Menambahkan 2x AIR MINERAL ke MEJA 4	4	\N	2026-06-15 10:37:28.690828
444	ADD_MENU	kasir2	Menambahkan 2x ICE TEA ke MEJA 2	2	\N	2026-06-15 10:55:24.533629
445	START_SESSION	kasir2	Mulai meja MEJA 1 (3 JAM WEEKDAYS) - Tamu: LUKI	1	\N	2026-06-15 11:23:50.16811
446	ADD_MENU	kasir2	Menambahkan 1x ICE TEA (FREE) ke MEJA 1	1	\N	2026-06-15 11:24:04.190192
447	ADD_MENU	kasir2	Menambahkan 1x ICE TEA ke MEJA 1	1	\N	2026-06-15 11:24:17.571435
448	START_SESSION	kasir2	Mulai meja MEJA 3 (1 JAM WEEKDAYS) - Tamu: SLIMIN	3	\N	2026-06-15 11:32:19.42397
449	STOP_SESSION	Sistem (Auto-Cutoff Prepaid)	Stop sesi meja MEJA 4. Durasi: 120 menit. Total Billiard: Rp 35,000 | Cafe: Rp 12,000 | SC: Rp 0 | PPN: Rp 0 | Grand Total: Rp 47,000 | Item Cafe: 2.000x AIR MINERAL	4	\N	2026-06-15 12:10:31.87528
450	STOP_SESSION	Sistem (Auto-Cutoff Prepaid)	Stop sesi meja MEJA 2. Durasi: 120 menit. Total Billiard: Rp 35,000 | Cafe: Rp 14,000 | SC: Rp 0 | PPN: Rp 0 | Grand Total: Rp 49,000 | Item Cafe: 2.000x ICE TEA	2	\N	2026-06-15 12:19:17.993218
451	ADD_MENU	kasir2	Menambahkan 1x NUTRI BOST ke MEJA 1	1	\N	2026-06-15 12:23:49.611499
452	ADD_MENU	kasir2	Menambahkan 1x TAMBAH ICE BATU ke MEJA 1	1	\N	2026-06-15 12:24:21.052397
453	START_SESSION	kasir2	Mulai meja MEJA 2 (2 JAM WEEKDAYS) - Tamu: REZA	2	\N	2026-06-15 12:27:55.600153
454	STOP_SESSION	Sistem (Auto-Cutoff Prepaid)	Stop sesi meja MEJA 3. Durasi: 60 menit. Total Billiard: Rp 20,000 | Cafe: Rp 0 | SC: Rp 0 | PPN: Rp 0 | Grand Total: Rp 20,000	3	\N	2026-06-15 12:32:19.595703
455	ADD_MENU	kasir2	Menambahkan 1x HAND GLOVE ke MEJA 2	2	\N	2026-06-15 12:33:51.577194
456	ADD_MENU	kasir2	Menambahkan 1x INDOMIE GORENG ke MEJA 1	1	\N	2026-06-15 12:39:53.71439
457	ADD_MENU	kasir2	Menambahkan 1x TAMBAH TELUR ke MEJA 1	1	\N	2026-06-15 12:40:05.803136
458	START_SESSION	kasir2	Mulai meja MEJA 3 (2 JAM WEEKDAYS) - Tamu: LANA	3	\N	2026-06-15 12:43:52.706742
459	START_SESSION	kasir2	Mulai meja MEJA 4 (3 JAM WEEKDAYS) - Tamu: HARTONO	4	\N	2026-06-15 13:18:53.164965
460	ADD_MENU	kasir2	Menambahkan 1x ICE TEA (FREE) ke MEJA 4	4	\N	2026-06-15 13:19:01.712588
461	ADD_MENU	kasir2	Menambahkan 1x AIR MINERAL ke MEJA 4	4	\N	2026-06-15 13:45:44.708319
462	START_SESSION	kasir2	Mulai meja MEJA 5 (3 JAM WEEKDAYS) - Tamu: INDRA	5	\N	2026-06-15 13:49:16.258249
463	ADD_MENU	kasir2	Menambahkan 1x ICE TEA (FREE) ke MEJA 5	5	\N	2026-06-15 13:53:30.949197
464	ADD_MENU	kasir2	Menambahkan 2x ICE TEA ke MEJA 5	5	\N	2026-06-15 13:53:51.529265
465	ADD_MENU	kasir2	Menambahkan 1x AIR MINERAL ke MEJA 4	4	\N	2026-06-15 14:11:31.992029
466	STOP_SESSION	Sistem (Auto-Cutoff Prepaid)	Stop sesi meja MEJA 1. Durasi: 180 menit. Total Billiard: Rp 53,000 | Cafe: Rp 30,000 | SC: Rp 0 | PPN: Rp 0 | Grand Total: Rp 83,000 | Item Cafe: 1.000x TAMBAH TELUR, 1.000x ICE TEA, 1.000x TAMBAH ICE BATU, 1.000x NUTRI BOST, 1.000x INDOMIE GORENG, 1.000x ICE TEA (FREE)	1	\N	2026-06-15 14:23:50.315586
467	STOP_SESSION	Sistem (Auto-Cutoff Prepaid)	Stop sesi meja MEJA 2. Durasi: 120 menit. Total Billiard: Rp 35,000 | Cafe: Rp 20,000 | SC: Rp 0 | PPN: Rp 0 | Grand Total: Rp 55,000 | Item Cafe: 1.000x HAND GLOVE	2	\N	2026-06-15 14:27:56.151405
468	STOP_SESSION	Sistem (Auto-Cutoff Prepaid)	Stop sesi meja MEJA 3. Durasi: 120 menit. Total Billiard: Rp 35,000 | Cafe: Rp 0 | SC: Rp 0 | PPN: Rp 0 | Grand Total: Rp 35,000	3	\N	2026-06-15 14:43:52.71114
469	START_SESSION	kasir2	Mulai meja MEJA 2 (1 JAM WEEKDAYS) - Tamu: .	2	\N	2026-06-15 14:50:23.057624
470	ADD_MENU	kasir2	Menambahkan 1x AMERICANO ICE ke MEJA 2	2	\N	2026-06-15 14:50:36.098377
471	ADD_MENU	kasir2	Menambahkan 1x CIMORY SUSU ke 1	1	\N	2026-06-15 14:53:21.931458
472	ADD_MENU	kasir2	Menambahkan 1x ICE TEA ke MEJA 2	2	\N	2026-06-15 15:27:53.386989
473	UPDATE_SETTINGS	0	Ubah pengaturan: customPricingDynamic: [{"categoryId":1,"basePrice":0,"timeSlots":[{"start":"10:00","end":"18:00","price":35000},{"start":"18:00","end":"02:00","price":"45000"},{"start":"02:00","end":"10:00","price":"45000"}]},{"categoryId":2,"basePrice":0,"timeSlots":[{"start":"10:00","end":"18:00","price":"25000"},{"start":"18:00","end":"02:00","price":"30000"},{"start":"02:00","end":"10:00","price":"30000"}]},{"categoryId":3,"basePrice":0,"timeSlots":[{"start":"10:00","end":"17:00","price":"20000"},{"start":"17:00","end":"02:00","price":"30000"},{"start":"02:00","end":"10:00","price":"30000"}]}] -> [{"categoryId":1,"basePrice":0,"timeSlots":[{"start":"10:00","end":"18:00","price":35000},{"start":"18:00","end":"02:00","price":"40000"},{"start":"02:00","end":"10:00","price":"40000"}]},{"categoryId":2,"basePrice":0,"timeSlots":[{"start":"10:00","end":"18:00","price":"25000"},{"start":"18:00","end":"02:00","price":"30000"},{"start":"02:00","end":"10:00","price":"30000"}]},{"categoryId":3,"basePrice":0,"timeSlots":[{"start":"10:00","end":"17:00","price":"20000"},{"start":"17:00","end":"02:00","price":"30000"},{"start":"02:00","end":"10:00","price":"30000"}]}]	\N	\N	2026-06-15 15:37:40.89282
474	UPDATE_SETTINGS	0	Ubah pengaturan: customPricingDynamic: [{"categoryId":1,"basePrice":0,"timeSlots":[{"start":"10:00","end":"18:00","price":35000},{"start":"18:00","end":"02:00","price":"40000"},{"start":"02:00","end":"10:00","price":"40000"}]},{"categoryId":2,"basePrice":0,"timeSlots":[{"start":"10:00","end":"18:00","price":"25000"},{"start":"18:00","end":"02:00","price":"30000"},{"start":"02:00","end":"10:00","price":"30000"}]},{"categoryId":3,"basePrice":0,"timeSlots":[{"start":"10:00","end":"17:00","price":"20000"},{"start":"17:00","end":"02:00","price":"30000"},{"start":"02:00","end":"10:00","price":"30000"}]}] -> [{"categoryId":1,"basePrice":0,"timeSlots":[{"start":"10:00","end":"18:00","price":35000},{"start":"18:00","end":"02:00","price":"40000"},{"start":"02:00","end":"10:00","price":"40000"}]},{"categoryId":2,"basePrice":0,"timeSlots":[{"start":"10:00","end":"18:00","price":"25000"},{"start":"18:00","end":"02:00","price":"30000"},{"start":"02:00","end":"10:00","price":"30000"}]},{"categoryId":3,"basePrice":0,"timeSlots":[{"start":"10:00","end":"17:00","price":"20000"},{"start":"17:00","end":"02:00","price":"25000"},{"start":"02:00","end":"10:00","price":"25000"}]}]	\N	\N	2026-06-15 15:37:52.52919
483	STOP_SESSION	Sistem (Auto-Cutoff Prepaid)	Stop sesi meja MEJA 4. Durasi: 180 menit. Total Billiard: Rp 53,000 | Cafe: Rp 12,000 | SC: Rp 0 | PPN: Rp 0 | Grand Total: Rp 65,000 | Item Cafe: 1.000x AIR MINERAL, 1.000x AIR MINERAL, 1.000x ICE TEA (FREE)	4	\N	2026-06-15 16:18:53.604101
528	STOP_SESSION	Sistem (Auto-Cutoff Prepaid)	Stop sesi meja MEJA 7. Durasi: 120 menit. Total Billiard: Rp 50,000 | Cafe: Rp 21,000 | SC: Rp 0 | PPN: Rp 0 | Grand Total: Rp 71,000 | Item Cafe: 3.000x ICE TEA	7	\N	2026-06-15 21:04:43.91683
529	STOP_SESSION	Sistem (Auto-Cutoff Prepaid)	Stop sesi meja MEJA 1. Durasi: 120 menit. Total Billiard: Rp 50,000 | Cafe: Rp 36,000 | SC: Rp 0 | PPN: Rp 0 | Grand Total: Rp 86,000 | Item Cafe: 1.000x KOPI GULA AREN, 1.000x AIR MINERAL, 1.000x HOT AMERICANO	1	\N	2026-06-15 21:12:35.782453
531	START_SESSION	kasir2	Mulai meja MEJA 2 (1 JAM WEEKDAYS) - Tamu: UCUP	2	\N	2026-06-15 21:24:01.036598
532	BILLIARD_PRICE_OVERRIDE	kasir2	Ubah harga billiard manual dari Rp 25,000 ke Rp 50,000	2	TAB-260615212400	2026-06-15 21:24:08.766199
475	UPDATE_SETTINGS	0	Ubah pengaturan: customPricingDynamic: [{"categoryId":1,"basePrice":0,"timeSlots":[{"start":"10:00","end":"18:00","price":35000},{"start":"18:00","end":"02:00","price":"40000"},{"start":"02:00","end":"10:00","price":"40000"}]},{"categoryId":2,"basePrice":0,"timeSlots":[{"start":"10:00","end":"18:00","price":"25000"},{"start":"18:00","end":"02:00","price":"30000"},{"start":"02:00","end":"10:00","price":"30000"}]},{"categoryId":3,"basePrice":0,"timeSlots":[{"start":"10:00","end":"17:00","price":"20000"},{"start":"17:00","end":"02:00","price":"25000"},{"start":"02:00","end":"10:00","price":"25000"}]}] -> [{"categoryId":1,"basePrice":0,"timeSlots":[{"start":"10:00","end":"18:00","price":35000},{"start":"18:00","end":"02:00","price":"40000"},{"start":"02:00","end":"10:00","price":"40000"}]},{"categoryId":2,"basePrice":0,"timeSlots":[{"start":"10:00","end":"18:00","price":"25000"},{"start":"18:00","end":"02:00","price":"30000"},{"start":"02:00","end":"10:00","price":"30000"}]},{"categoryId":3,"basePrice":0,"timeSlots":[{"start":"10:00","end":"17:00","price":"20000"},{"start":"17:00","end":"02:00","price":"30000"},{"start":"02:00","end":"10:00","price":"30000"}]}]	\N	\N	2026-06-15 15:38:05.036598
476	UPDATE_SETTINGS	0	Ubah pengaturan: customPricingDynamic: [{"categoryId":1,"basePrice":0,"timeSlots":[{"start":"10:00","end":"18:00","price":35000},{"start":"18:00","end":"02:00","price":"40000"},{"start":"02:00","end":"10:00","price":"40000"}]},{"categoryId":2,"basePrice":0,"timeSlots":[{"start":"10:00","end":"18:00","price":"25000"},{"start":"18:00","end":"02:00","price":"30000"},{"start":"02:00","end":"10:00","price":"30000"}]},{"categoryId":3,"basePrice":0,"timeSlots":[{"start":"10:00","end":"17:00","price":"20000"},{"start":"17:00","end":"02:00","price":"30000"},{"start":"02:00","end":"10:00","price":"30000"}]}] -> [{"categoryId":1,"basePrice":0,"timeSlots":[{"start":"10:00","end":"18:00","price":35000},{"start":"18:00","end":"02:00","price":"45000"},{"start":"02:00","end":"10:00","price":"45000"}]},{"categoryId":2,"basePrice":0,"timeSlots":[{"start":"10:00","end":"18:00","price":"25000"},{"start":"18:00","end":"02:00","price":"30000"},{"start":"02:00","end":"10:00","price":"30000"}]},{"categoryId":3,"basePrice":0,"timeSlots":[{"start":"10:00","end":"17:00","price":"20000"},{"start":"17:00","end":"02:00","price":"30000"},{"start":"02:00","end":"10:00","price":"30000"}]}]	\N	\N	2026-06-15 15:38:15.626449
477	UPDATE_SETTINGS	0	Ubah pengaturan: customPricingDynamic: [{"categoryId":1,"basePrice":0,"timeSlots":[{"start":"10:00","end":"18:00","price":35000},{"start":"18:00","end":"02:00","price":"45000"},{"start":"02:00","end":"10:00","price":"45000"}]},{"categoryId":2,"basePrice":0,"timeSlots":[{"start":"10:00","end":"18:00","price":"25000"},{"start":"18:00","end":"02:00","price":"30000"},{"start":"02:00","end":"10:00","price":"30000"}]},{"categoryId":3,"basePrice":0,"timeSlots":[{"start":"10:00","end":"17:00","price":"20000"},{"start":"17:00","end":"02:00","price":"30000"},{"start":"02:00","end":"10:00","price":"30000"}]}] -> [{"categoryId":1,"basePrice":0,"timeSlots":[{"start":"10:00","end":"18:00","price":35000},{"start":"18:00","end":"02:00","price":"45000"},{"start":"02:00","end":"10:00","price":"45000"}]},{"categoryId":2,"basePrice":0,"timeSlots":[{"start":"10:00","end":"18:00","price":"25000"},{"start":"18:00","end":"02:00","price":"35000"},{"start":"02:00","end":"10:00","price":"35000"}]},{"categoryId":3,"basePrice":0,"timeSlots":[{"start":"10:00","end":"17:00","price":"20000"},{"start":"17:00","end":"02:00","price":"30000"},{"start":"02:00","end":"10:00","price":"30000"}]}]	\N	\N	2026-06-15 15:38:45.666131
478	BILLIARD_PRICE_OVERRIDE	kasir2	Ubah harga billiard manual dari Rp 20,000 ke Rp 40,000	2	TAB-260615145022	2026-06-15 15:44:03.629445
479	EXTEND_SESSION	kasir2	Tambah waktu meja MEJA 2 selama 60 menit. Tambahan biaya: Rp 20,000	2	\N	2026-06-15 15:44:03.943728
480	ADD_MENU	kasir2	Menambahkan 1x KOPI GULA AREN ke 1	1	\N	2026-06-15 15:49:10.083411
481	START_SESSION	kasir2	Mulai meja MEJA 6 (2 JAM WEEKDAYS) - Tamu: ARTA	6	\N	2026-06-15 16:04:53.589387
482	ADD_MENU	kasir2	Menambahkan 1x BLUE LAKEN ke MEJA 6	6	\N	2026-06-15 16:05:12.38367
484	BILLIARD_PRICE_OVERRIDE	kasir2	Ubah harga billiard manual dari Rp 53,000 ke Rp 73,000	4	TAB-260615131853	2026-06-15 16:19:56.635475
485	EXTEND_SESSION	kasir2	Tambah waktu meja MEJA 4 selama 60 menit. Tambahan biaya: Rp 20,000	4	\N	2026-06-15 16:19:56.709317
486	STOP_SESSION	Sistem (Auto-Cutoff Prepaid)	Stop sesi meja MEJA 5. Durasi: 180 menit. Total Billiard: Rp 53,000 | Cafe: Rp 14,000 | SC: Rp 0 | PPN: Rp 0 | Grand Total: Rp 67,000 | Item Cafe: 2.000x ICE TEA, 1.000x ICE TEA (FREE)	5	\N	2026-06-15 16:49:16.860036
487	STOP_SESSION	Sistem (Auto-Cutoff Prepaid)	Stop sesi meja MEJA 2. Durasi: 120 menit. Total Billiard: Rp 40,000 | Cafe: Rp 22,000 | SC: Rp 0 | PPN: Rp 0 | Grand Total: Rp 62,000 | Item Cafe: 1.000x ICE TEA, 1.000x AMERICANO ICE	2	\N	2026-06-15 16:50:23.328953
488	STOP_SESSION	Sistem (Auto-Cutoff Prepaid)	Stop sesi meja MEJA 4. Durasi: 241 menit. Total Billiard: Rp 73,000 | Cafe: Rp 12,000 | SC: Rp 0 | PPN: Rp 0 | Grand Total: Rp 85,000 | Item Cafe: 1.000x AIR MINERAL, 1.000x AIR MINERAL, 1.000x ICE TEA (FREE)	4	\N	2026-06-15 17:19:57.131072
489	STOP_SESSION	Sistem (Auto-Cutoff Prepaid)	Stop sesi meja MEJA 6. Durasi: 120 menit. Total Billiard: Rp 35,000 | Cafe: Rp 15,000 | SC: Rp 0 | PPN: Rp 0 | Grand Total: Rp 50,000 | Item Cafe: 1.000x BLUE LAKEN	6	\N	2026-06-15 18:04:54.002174
490	START_SESSION	kasir2	Mulai meja MEJA 3 (1 JAM WEEKDAYS) - Tamu: ...	3	\N	2026-06-15 18:36:14.527675
491	BILLIARD_PRICE_OVERRIDE	kasir2	Ubah harga billiard manual dari Rp 25,000 ke Rp 50,000	3	TAB-260615183614	2026-06-15 18:36:36.021799
492	EXTEND_SESSION	kasir2	Tambah waktu meja MEJA 3 selama 60 menit. Tambahan biaya: Rp 25,000	3	\N	2026-06-15 18:36:36.099395
493	START_SESSION	kasir2	Mulai meja MEJA 7 (1 JAM WEEKDAYS) - Tamu: ROI	7	\N	2026-06-15 19:04:43.8958
494	BILLIARD_PRICE_OVERRIDE	kasir2	Ubah harga billiard manual dari Rp 25,000 ke Rp 50,000	7	TAB-260615190443	2026-06-15 19:05:16.481144
495	EXTEND_SESSION	kasir2	Tambah waktu meja MEJA 7 selama 60 menit. Tambahan biaya: Rp 25,000	7	\N	2026-06-15 19:05:16.651973
496	ADD_MENU	kasir2	Menambahkan 3x ICE TEA ke MEJA 7	7	\N	2026-06-15 19:05:27.832954
497	ADD_MENU	kasir2	Menambahkan 2x ICE TEA ke MEJA 3	3	\N	2026-06-15 19:05:37.635155
498	START_SESSION	kasir2	Mulai meja MEJA 1 (1 JAM WEEKDAYS) - Tamu: PUNGKY	1	\N	2026-06-15 19:12:35.385468
499	BILLIARD_PRICE_OVERRIDE	kasir2	Ubah harga billiard manual dari Rp 25,000 ke Rp 50,000	1	TAB-260615191235	2026-06-15 19:16:04.765628
500	EXTEND_SESSION	kasir2	Tambah waktu meja MEJA 1 selama 60 menit. Tambahan biaya: Rp 25,000	1	\N	2026-06-15 19:16:04.894784
501	START_SESSION	kasir2	Mulai meja MEJA 4 (1 JAM WEEKDAYS) - Tamu: YENI	4	\N	2026-06-15 19:31:26.602332
502	ADD_MENU	kasir2	Menambahkan 1x HAND GLOVE ke MEJA 4	4	\N	2026-06-15 19:31:41.889236
503	ADD_MENU	kasir2	Menambahkan 1x HOT AMERICANO ke MEJA 1	1	\N	2026-06-15 19:36:29.70407
504	ADD_MENU	kasir2	Menambahkan 1x KOPI GULA AREN ke MEJA 1	1	\N	2026-06-15 19:36:38.370149
505	START_SESSION	kasir2	Mulai meja MEJA 8 (1 JAM WEEKDAYS) - Tamu: RICKY	8	\N	2026-06-15 19:39:40.385914
506	BILLIARD_PRICE_OVERRIDE	kasir2	Ubah harga billiard manual dari Rp 25,000 ke Rp 50,000	8	TAB-260615193940	2026-06-15 19:39:51.511014
507	EXTEND_SESSION	kasir2	Tambah waktu meja MEJA 8 selama 60 menit. Tambahan biaya: Rp 25,000	8	\N	2026-06-15 19:39:51.595884
508	ADD_MENU	kasir2	Menambahkan 1x AIR MINERAL ke MEJA 8	8	\N	2026-06-15 19:43:19.110401
509	START_SESSION	kasir2	Mulai meja MEJA 2 (OPEN TABLE WEEKDAYS) - Tamu: ARTA	2	\N	2026-06-15 19:44:05.881326
510	ADD_MENU	kasir2	Menambahkan 1x AIR MINERAL ke MEJA 1	1	\N	2026-06-15 19:44:28.492125
511	START_SESSION	kasir2	Mulai meja MEJA 6 (OPEN TABLE WEEKDAYS) - Tamu: AALEX	6	\N	2026-06-15 19:46:10.15749
512	ADD_MENU	kasir2	Menambahkan 1x BINTANG ZERO ke MEJA 6	6	\N	2026-06-15 19:48:00.945053
513	ADD_MENU	kasir2	Menambahkan 1x COFFE BEAR ke MEJA 8	8	\N	2026-06-15 19:59:01.439233
514	ADD_MENU	kasir2	Menambahkan 1x KENTANG GORENG ke MEJA 8	8	\N	2026-06-15 19:59:40.336403
515	ADD_MENU	kasir2	Menambahkan 1x KOPI GULA AREN ke MEJA 8	8	\N	2026-06-15 19:59:50.754126
516	ADD_MENU	kasir2	Menambahkan 1x BINTANG ZERO ke MEJA 6	6	\N	2026-06-15 20:14:32.110112
517	ADD_MENU	kasir2	Menambahkan 1x MIX PLATER ke MEJA 6	6	\N	2026-06-15 20:14:42.148902
518	START_SESSION	kasir2	Mulai meja MEJA 5 (3 JAM WEEKDAYS) - Tamu: ANTON	5	\N	2026-06-15 20:23:37.567943
519	ADD_MENU	kasir2	Menambahkan 1x ICE TEA (FREE) ke MEJA 5	5	\N	2026-06-15 20:23:49.44844
520	ADD_MENU	kasir2	Menambahkan 2x ICE TEA ke MEJA 5	5	\N	2026-06-15 20:24:00.625123
521	STOP_SESSION	Sistem (Auto-Cutoff Prepaid)	Stop sesi meja MEJA 4. Durasi: 60 menit. Total Billiard: Rp 25,000 | Cafe: Rp 20,000 | SC: Rp 0 | PPN: Rp 0 | Grand Total: Rp 45,000 | Item Cafe: 1.000x HAND GLOVE	4	\N	2026-06-15 20:31:26.72047
522	STOP_SESSION	Sistem (Auto-Cutoff Prepaid)	Stop sesi meja MEJA 3. Durasi: 120 menit. Total Billiard: Rp 50,000 | Cafe: Rp 14,000 | SC: Rp 0 | PPN: Rp 0 | Grand Total: Rp 64,000 | Item Cafe: 2.000x ICE TEA	3	\N	2026-06-15 20:36:14.810651
523	START_SESSION	kasir2	Mulai meja MEJA 4 (3 JAM WEEKDAYS) - Tamu: MAMAT	4	\N	2026-06-15 20:45:09.226411
524	START_SESSION	kasir2	Mulai meja MEJA 3 (OPEN TABLE WEEKDAYS) - Tamu: lerian	3	\N	2026-06-15 20:58:34.063757
525	ADD_MENU	kasir2	Menambahkan 1x AIR MINERAL ke MEJA 2	2	\N	2026-06-15 20:59:18.571048
526	ADD_MENU	kasir2	Menambahkan 1x AIR MINERAL ke MEJA 6	6	\N	2026-06-15 20:59:32.213737
527	ADD_MENU	kasir2	Menambahkan 1x ICE TEA (FREE) ke MEJA 4	4	\N	2026-06-15 21:03:12.021756
530	MOVE_TABLE	kasir2	Move Table Billiard Meja MEJA 2 ke Meja MEJA 1. Total Rp 44,000	1	\N	2026-06-15 21:14:58.216235
533	EXTEND_SESSION	kasir2	Tambah waktu meja MEJA 2 selama 60 menit. Tambahan biaya: Rp 25,000	2	\N	2026-06-15 21:24:08.842945
534	START_SESSION	kasir2	Mulai meja MEJA 7 (1 JAM WEEKDAYS) - Tamu: RENDY 	7	\N	2026-06-15 21:28:14.124602
535	BILLIARD_PRICE_OVERRIDE	kasir2	Ubah harga billiard manual dari Rp 25,000 ke Rp 50,000	7	TAB-260615212813	2026-06-15 21:28:20.399838
536	EXTEND_SESSION	kasir2	Tambah waktu meja MEJA 7 selama 60 menit. Tambahan biaya: Rp 25,000	7	\N	2026-06-15 21:28:20.490136
537	ADD_MENU	kasir2	Menambahkan 2x KOPI GULA AREN ke MEJA 3	3	\N	2026-06-15 21:30:15.151004
538	ADD_MENU	kasir2	Menambahkan 1x MIX PLATER ke MEJA 3	3	\N	2026-06-15 21:30:24.720283
539	BILLIARD_PRICE_OVERRIDE	kasir2	Ubah harga billiard manual dari Rp 50,000 ke Rp 75,000	2	TAB-260615212400	2026-06-15 21:38:26.594301
540	EXTEND_SESSION	kasir2	Tambah waktu meja MEJA 2 selama 60 menit. Tambahan biaya: Rp 25,000	2	\N	2026-06-15 21:38:26.677311
541	ADD_MENU	kasir2	Menambahkan 1x BLUE LAKEN ke MEJA 3	3	\N	2026-06-15 21:38:43.481055
542	ADD_MENU	kasir2	Menambahkan 1x AIR MINERAL ke MEJA 2	2	\N	2026-06-15 21:39:28.551404
543	STOP_SESSION	Sistem (Auto-Cutoff Prepaid)	Stop sesi meja MEJA 8. Durasi: 120 menit. Total Billiard: Rp 50,000 | Cafe: Rp 48,000 | SC: Rp 0 | PPN: Rp 0 | Grand Total: Rp 98,000 | Item Cafe: 1.000x KOPI GULA AREN, 1.000x AIR MINERAL, 1.000x COFFE BEAR, 1.000x KENTANG GORENG	8	\N	2026-06-15 21:39:40.703033
544	START_SESSION	kasir2	Mulai meja MEJA 12 (1 JAM WEEKDAYS) - Tamu: ANA	12	\N	2026-06-15 21:40:54.364794
545	BILLIARD_PRICE_OVERRIDE	kasir2	Ubah harga billiard manual dari Rp 40,000 ke Rp 80,000	12	TAB-260615214053	2026-06-15 21:41:01.368591
546	EXTEND_SESSION	kasir2	Tambah waktu meja MEJA 12 selama 60 menit. Tambahan biaya: Rp 40,000	12	\N	2026-06-15 21:41:02.010067
547	ADD_MENU	kasir2	Menambahkan 1x LYCHEE TEA ke MEJA 7	7	\N	2026-06-15 21:41:56.309386
548	START_SESSION	kasir2	Mulai meja MEJA 8 (OPEN TABLE WEEKDAYS) - Tamu: ....	8	\N	2026-06-15 21:52:31.441892
549	ADD_MENU	kasir2	Menambahkan 1x TEMULAWAK BEAR ke MEJA 8	8	\N	2026-06-15 21:59:22.142344
550	ADD_MENU	kasir2	Menambahkan 1x RUJAK CIRENG ke MEJA 8	8	\N	2026-06-15 21:59:30.990784
551	ADD_MENU	kasir2	Menambahkan 1x KOPI SUSU ke MEJA 8	8	\N	2026-06-15 21:59:45.501147
552	ADD_MENU	kasir2	Menambahkan 1x WATER LEMON SPRITE ke MEJA 8	8	\N	2026-06-15 21:59:54.27235
553	BILLIARD_PRICE_OVERRIDE	kasir2	Ubah harga billiard manual dari Rp 30,833 ke Rp 64,583	6	TAB-260615194609	2026-06-15 22:20:14.12896
554	STOP_SESSION	kasir2	Stop sesi meja MEJA 6. Durasi: 154 menit. Total Billiard: Rp 64,583 | Cafe: Rp 45,000 | SC: Rp 0 | PPN: Rp 0 | Grand Total: Rp 109,600 | Item Cafe: 1.000x BINTANG ZERO, 1.000x BINTANG ZERO, 1.000x MIX PLATER, 1.000x AIR MINERAL	6	\N	2026-06-15 22:20:14.289398
555	ADD_MENU	kasir2	Menambahkan 1x MILO DINO ke MEJA 1	1	\N	2026-06-15 22:56:54.530953
556	ADD_MENU	kasir2	Menambahkan 1x MATCHA ke MEJA 1	1	\N	2026-06-15 22:57:04.416855
557	STOP_SESSION	Sistem (Auto-Cutoff Prepaid)	Stop sesi meja MEJA 5. Durasi: 180 menit. Total Billiard: Rp 77,000 | Cafe: Rp 14,000 | SC: Rp 0 | PPN: Rp 0 | Grand Total: Rp 91,000 | Item Cafe: 2.000x ICE TEA, 1.000x ICE TEA (FREE)	5	\N	2026-06-15 23:23:38.226709
558	STOP_SESSION	Sistem (Auto-Cutoff Prepaid)	Stop sesi meja MEJA 7. Durasi: 120 menit. Total Billiard: Rp 50,000 | Cafe: Rp 10,000 | SC: Rp 0 | PPN: Rp 0 | Grand Total: Rp 60,000 | Item Cafe: 1.000x LYCHEE TEA	7	\N	2026-06-15 23:28:14.329336
559	BILLIARD_PRICE_OVERRIDE	kasir2	Ubah harga billiard manual dari Rp 25,000 ke Rp 65,000	3	TAB-260615205833	2026-06-15 23:33:44.268368
560	STOP_SESSION	kasir2	Stop sesi meja MEJA 3. Durasi: 155 menit. Total Billiard: Rp 65,000 | Cafe: Rp 60,000 | SC: Rp 0 | PPN: Rp 0 | Grand Total: Rp 125,000 | Item Cafe: 2.000x KOPI GULA AREN, 1.000x MIX PLATER, 1.000x BLUE LAKEN	3	\N	2026-06-15 23:33:44.467609
561	START_SESSION	kasir2	Mulai meja MEJA 3 (2 JAM WEEKDAYS) - Tamu: REHAN	3	\N	2026-06-15 23:34:48.220596
562	STOP_SESSION	Sistem (Auto-Cutoff Prepaid)	Stop sesi meja MEJA 12. Durasi: 120 menit. Total Billiard: Rp 80,000 | Cafe: Rp 0 | SC: Rp 0 | PPN: Rp 0 | Grand Total: Rp 80,000	12	\N	2026-06-15 23:40:54.238002
563	STOP_SESSION	Sistem (Auto-Cutoff Prepaid)	Stop sesi meja MEJA 4. Durasi: 180 menit. Total Billiard: Rp 77,000 | Cafe: Rp 0 | SC: Rp 0 | PPN: Rp 0 | Grand Total: Rp 77,000 | Item Cafe: 1.000x ICE TEA (FREE)	4	\N	2026-06-15 23:45:09.67183
564	START_SESSION	kasir2	Mulai meja MEJA 5 (1 JAM WEEKDAYS) - Tamu: AGUNG	5	\N	2026-06-15 23:49:02.095327
565	BILLIARD_PRICE_OVERRIDE	kasir2	Ubah harga billiard manual dari Rp 25,000 ke Rp 50,000	5	TAB-260615234901	2026-06-15 23:49:12.222692
566	EXTEND_SESSION	kasir2	Tambah waktu meja MEJA 5 selama 60 menit. Tambahan biaya: Rp 25,000	5	\N	2026-06-15 23:49:12.535913
567	ADD_MENU	kasir2	Menambahkan 1x LEMON TEA ke MEJA 8	8	\N	2026-06-15 23:49:36.715671
568	ADD_MENU	kasir2	Menambahkan 1x AIR MINERAL ke MEJA 3	3	\N	2026-06-16 00:01:24.627586
569	BILLIARD_PRICE_OVERRIDE	kasir2	Ubah harga billiard manual dari Rp 80,417 ke Rp 110,834	1	TAB-260615194405	2026-06-16 00:09:55.360504
570	STOP_SESSION	kasir2	Stop sesi meja MEJA 1. Durasi: 266 menit. Total Billiard: Rp 110,834 | Cafe: Rp 36,000 | SC: Rp 0 | PPN: Rp 0 | Grand Total: Rp 146,900 | Item Cafe: 1.000x AIR MINERAL, 1.000x MILO DINO, 1.000x MATCHA	1	\N	2026-06-16 00:09:55.52461
571	BILLIARD_PRICE_OVERRIDE	kasir2	Ubah harga billiard manual dari Rp 49,167 ke Rp 62,916	8	TAB-260615215230	2026-06-16 00:22:46.707802
572	STOP_SESSION	kasir2	Stop sesi meja MEJA 8. Durasi: 150 menit. Total Billiard: Rp 62,916 | Cafe: Rp 61,000 | SC: Rp 0 | PPN: Rp 0 | Grand Total: Rp 124,000 | Item Cafe: 1.000x TEMULAWAK BEAR, 1.000x WATER LEMON SPRITE, 1.000x RUJAK CIRENG, 1.000x KOPI SUSU, 1.000x LEMON TEA	8	\N	2026-06-16 00:22:46.850948
573	STOP_SESSION	Sistem (Auto-Cutoff Prepaid)	Stop sesi meja MEJA 2. Durasi: 180 menit. Total Billiard: Rp 75,000 | Cafe: Rp 6,000 | SC: Rp 0 | PPN: Rp 0 | Grand Total: Rp 81,000 | Item Cafe: 1.000x AIR MINERAL	2	\N	2026-06-16 00:24:01.1868
574	STOP_SESSION	Sistem (Auto-Cutoff Prepaid)	Stop sesi meja MEJA 3. Durasi: 120 menit. Total Billiard: Rp 40,000 | Cafe: Rp 6,000 | SC: Rp 0 | PPN: Rp 0 | Grand Total: Rp 46,000 | Item Cafe: 1.000x AIR MINERAL	3	\N	2026-06-16 01:34:48.498692
575	STOP_SESSION	Sistem (Auto-Cutoff Prepaid)	Stop sesi meja MEJA 5. Durasi: 120 menit. Total Billiard: Rp 50,000 | Cafe: Rp 0 | SC: Rp 0 | PPN: Rp 0 | Grand Total: Rp 50,000	5	\N	2026-06-16 01:49:02.307732
576	START_SESSION	kasir1	Mulai meja MEJA 2 (1 JAM WEEKEND) - Tamu: ANDI	2	\N	2026-06-16 10:11:25.205408
577	BILLIARD_PRICE_OVERRIDE	kasir1	Ubah harga billiard manual dari Rp 20,000 ke Rp 40,000	2	TAB-260616101125	2026-06-16 10:11:46.234369
578	EXTEND_SESSION	kasir1	Tambah waktu meja MEJA 2 selama 60 menit. Tambahan biaya: Rp 20,000	2	\N	2026-06-16 10:11:46.317621
579	START_SESSION	kasir1	Mulai meja MEJA 9 (3 JAM WEEKEND) - Tamu: RIZAQ	9	\N	2026-06-16 10:55:09.320802
580	ADD_MENU	kasir1	Menambahkan 1x ICE TEA (FREE) ke MEJA 9	9	\N	2026-06-16 10:56:47.992032
581	START_SESSION	kasir1	Mulai meja MEJA 11 (3 JAM WEEKEND) - Tamu: RAFLI	11	\N	2026-06-16 11:04:03.22135
582	ADD_MENU	kasir1	Menambahkan 1x ICE TEA (FREE) ke MEJA 11	11	\N	2026-06-16 11:04:12.941966
583	ADD_MENU	kasir1	Menambahkan 1x CAPPUCINNO ke MEJA 11	11	\N	2026-06-16 11:04:21.86241
584	ADD_MENU	kasir1	Menambahkan 1x AIR MINERAL ke MEJA 11	11	\N	2026-06-16 11:04:30.4189
586	ADD_MENU	kasir1	Menambahkan 1x ICE TEA ke MEJA 2	2	\N	2026-06-16 11:15:36.427344
587	START_SESSION	kasir1	Mulai meja MEJA 3 (3 JAM WEEKEND) - Tamu: ICHI	3	\N	2026-06-16 11:39:05.626083
588	ADD_MENU	kasir1	Menambahkan 1x ICE TEA (FREE) ke MEJA 3	3	\N	2026-06-16 11:39:14.079868
589	ADD_MENU	kasir1	Menambahkan 1x ICE TEA ke MEJA 3	3	\N	2026-06-16 11:39:33.867431
590	ADD_MENU	kasir1	Menambahkan 1x MIX PLATER ke MEJA 3	3	\N	2026-06-16 11:39:43.260928
591	START_SESSION	kasir1	Mulai meja MEJA 1 (1 JAM WEEKEND) - Tamu: ALEN	1	\N	2026-06-16 11:43:53.835475
592	BILLIARD_PRICE_OVERRIDE	kasir1	Ubah harga billiard manual dari Rp 20,000 ke Rp 40,000	1	TAB-260616114353	2026-06-16 11:43:58.312685
593	EXTEND_SESSION	kasir1	Tambah waktu meja MEJA 1 selama 60 menit. Tambahan biaya: Rp 20,000	1	\N	2026-06-16 11:43:58.628183
594	ADD_MENU	kasir1	Menambahkan 1x ICE TEA ke MEJA 2	2	\N	2026-06-16 12:10:10.852343
595	STOP_SESSION	Sistem (Auto-Cutoff Prepaid)	Stop sesi meja MEJA 2. Durasi: 120 menit. Total Billiard: Rp 40,000 | Cafe: Rp 14,000 | SC: Rp 0 | PPN: Rp 0 | Grand Total: Rp 54,000 | Item Cafe: 1.000x ICE TEA, 1.000x ICE TEA	2	\N	2026-06-16 12:11:25.426271
596	ADD_MENU	kasir1	Menambahkan 1x YOU C 1000 ke MEJA 1	1	\N	2026-06-16 12:33:18.928981
597	START_SESSION	kasir1	Mulai meja MEJA 8 (3 JAM WEEKEND) - Tamu: candra	8	\N	2026-06-16 12:59:35.108119
598	ADD_MENU	kasir1	Menambahkan 1x ICE TEA (FREE) ke MEJA 8	8	\N	2026-06-16 12:59:43.471753
599	ADD_MENU	kasir1	Menambahkan 2x RED VELVET ke MEJA 8	8	\N	2026-06-16 12:59:53.982182
600	ADD_MENU	kasir1	Menambahkan 1x RUJAK CIRENG ke MEJA 8	8	\N	2026-06-16 13:00:03.063607
601	STOP_SESSION	Sistem (Auto-Cutoff Prepaid)	Stop sesi meja MEJA 1. Durasi: 120 menit. Total Billiard: Rp 40,000 | Cafe: Rp 12,000 | SC: Rp 0 | PPN: Rp 0 | Grand Total: Rp 52,000 | Item Cafe: 1.000x YOU C 1000	1	\N	2026-06-16 13:43:54.043553
602	STOP_SESSION	Sistem (Auto-Cutoff Prepaid)	Stop sesi meja MEJA 9. Durasi: 180 menit. Total Billiard: Rp 70,000 | Cafe: Rp 12,000 | SC: Rp 0 | PPN: Rp 0 | Grand Total: Rp 82,000 | Item Cafe: 2.000x AIR MINERAL, 1.000x ICE TEA (FREE)	9	\N	2026-06-16 13:55:09.548286
603	BILLIARD_PRICE_OVERRIDE	kasir1	Ubah harga billiard manual dari Rp 70,000 ke Rp 95,000	9	TAB-260616105508	2026-06-16 13:56:42.60417
604	EXTEND_SESSION	kasir1	Tambah waktu meja MEJA 9 selama 60 menit. Tambahan biaya: Rp 25,000	9	\N	2026-06-16 13:56:42.83941
605	STOP_SESSION	Sistem (Auto-Cutoff Prepaid)	Stop sesi meja MEJA 11. Durasi: 180 menit. Total Billiard: Rp 100,000 | Cafe: Rp 21,000 | SC: Rp 0 | PPN: Rp 0 | Grand Total: Rp 121,000 | Item Cafe: 1.000x AIR MINERAL, 1.000x CAPPUCINNO, 1.000x ICE TEA (FREE)	11	\N	2026-06-16 14:04:03.404006
606	STOP_SESSION	Sistem (Auto-Cutoff Prepaid)	Stop sesi meja MEJA 3. Durasi: 180 menit. Total Billiard: Rp 55,000 | Cafe: Rp 22,000 | SC: Rp 0 | PPN: Rp 0 | Grand Total: Rp 77,000 | Item Cafe: 1.000x ICE TEA, 1.000x MIX PLATER, 1.000x ICE TEA (FREE)	3	\N	2026-06-16 14:39:05.711179
607	BILLIARD_PRICE_OVERRIDE	kasir1	Ubah harga billiard manual dari Rp 55,000 ke Rp 75,000	3	TAB-260616113905	2026-06-16 14:39:28.508599
608	EXTEND_SESSION	kasir1	Tambah waktu meja MEJA 3 selama 60 menit. Tambahan biaya: Rp 20,000	3	\N	2026-06-16 14:39:28.59288
609	STOP_SESSION	Sistem (Auto-Cutoff Prepaid)	Stop sesi meja MEJA 9. Durasi: 242 menit. Total Billiard: Rp 95,000 | Cafe: Rp 12,000 | SC: Rp 0 | PPN: Rp 0 | Grand Total: Rp 107,000 | Item Cafe: 2.000x AIR MINERAL, 1.000x ICE TEA (FREE)	9	\N	2026-06-16 14:56:43.546654
610	START_SESSION	kasir1	Mulai meja MEJA 1 (1 JAM WEEKEND) - Tamu: bagus	1	\N	2026-06-16 15:13:29.770423
611	BILLIARD_PRICE_OVERRIDE	kasir1	Ubah harga billiard manual dari Rp 20,000 ke Rp 40,000	1	TAB-260616151329	2026-06-16 15:13:59.719666
612	EXTEND_SESSION	kasir1	Tambah waktu meja MEJA 1 selama 60 menit. Tambahan biaya: Rp 20,000	1	\N	2026-06-16 15:13:59.793155
613	BILLIARD_PRICE_OVERRIDE	kasir1	Ubah harga billiard manual dari Rp 40,000 ke Rp 60,000	1	TAB-260616151329	2026-06-16 15:14:38.491727
614	EXTEND_SESSION	kasir1	Tambah waktu meja MEJA 1 selama 60 menit. Tambahan biaya: Rp 20,000	1	\N	2026-06-16 15:14:38.565971
615	START_SESSION	kasir1	Mulai meja MEJA 2 (1 JAM WEEKEND) - Tamu: lucky	2	\N	2026-06-16 15:23:12.129801
616	BILLIARD_PRICE_OVERRIDE	kasir1	Ubah harga billiard manual dari Rp 20,000 ke Rp 40,000	2	TAB-260616152311	2026-06-16 15:23:35.210076
617	EXTEND_SESSION	kasir1	Tambah waktu meja MEJA 2 selama 60 menit. Tambahan biaya: Rp 20,000	2	\N	2026-06-16 15:23:35.286547
618	STOP_SESSION	Sistem (Auto-Cutoff Prepaid)	Stop sesi meja MEJA 3. Durasi: 240 menit. Total Billiard: Rp 75,000 | Cafe: Rp 22,000 | SC: Rp 0 | PPN: Rp 0 | Grand Total: Rp 97,000 | Item Cafe: 1.000x ICE TEA, 1.000x MIX PLATER, 1.000x ICE TEA (FREE)	3	\N	2026-06-16 15:39:28.870045
619	ADD_MENU	kasir1	Menambahkan 1x KOPI HITAM ke MEJA 1	1	\N	2026-06-16 15:40:19.166508
620	ADD_MENU	kasir1	Menambahkan 2x LEMON TEA ke MEJA 2	2	\N	2026-06-16 15:40:44.466101
621	ADD_MENU	kasir1	Menambahkan 1x ICE TEA (FREE) ke MEJA 1	1	\N	2026-06-16 15:41:11.058337
622	START_SESSION	kasir1	Mulai meja MEJA 4 (OPEN TABLE WEEKEND) - Tamu: bogel	4	\N	2026-06-16 15:48:05.481571
623	ADD_MENU	kasir1	Menambahkan 1x AIR MINERAL ke MEJA 4	4	\N	2026-06-16 15:48:14.16581
624	STOP_SESSION	Sistem (Auto-Cutoff Prepaid)	Stop sesi meja MEJA 8. Durasi: 180 menit. Total Billiard: Rp 55,000 | Cafe: Rp 45,000 | SC: Rp 0 | PPN: Rp 0 | Grand Total: Rp 100,000 | Item Cafe: 1.000x RUJAK CIRENG, 2.000x RED VELVET, 1.000x ICE TEA (FREE)	8	\N	2026-06-16 15:59:34.768744
625	ADD_MENU	kasir1	Menambahkan 1x SOSIS MERAH ke MEJA 2	2	\N	2026-06-16 16:48:33.065885
626	BILLIARD_PRICE_OVERRIDE	kasir1	Ubah harga billiard manual dari Rp 40,000 ke Rp 70,000	2	TAB-260616152311	2026-06-16 17:14:52.050414
627	EXTEND_SESSION	kasir1	Tambah waktu meja MEJA 2 selama 60 menit. Tambahan biaya: Rp 30,000	2	\N	2026-06-16 17:14:52.160817
628	ADD_MENU	kasir2	Menambahkan 1x CIMORY SUSU ke MEJA 1	1	\N	2026-06-16 17:42:54.059196
629	ADD_MENU	kasir2	Menambahkan 1x LEMON TEA ke MEJA 2	2	\N	2026-06-16 17:43:06.565156
630	ADD_MENU	kasir2	Menambahkan 1x AIR MINERAL ke MEJA 4	4	\N	2026-06-16 17:43:20.702006
631	BILLIARD_PRICE_OVERRIDE	kasir2	Ubah harga billiard manual dari Rp 46,000 ke Rp 50,000	4	TAB-260616154805	2026-06-16 17:51:08.403559
632	STOP_SESSION	kasir2	Stop sesi meja MEJA 4. Durasi: 123 menit. Total Billiard: Rp 50,000 | Cafe: Rp 12,000 | SC: Rp 0 | PPN: Rp 0 | Grand Total: Rp 62,000 | Item Cafe: 1.000x AIR MINERAL, 1.000x AIR MINERAL	4	\N	2026-06-16 17:51:08.722698
633	STOP_SESSION	Sistem (Auto-Cutoff Prepaid)	Stop sesi meja MEJA 1. Durasi: 180 menit. Total Billiard: Rp 60,000 | Cafe: Rp 22,000 | SC: Rp 0 | PPN: Rp 0 | Grand Total: Rp 82,000 | Item Cafe: 1.000x KOPI HITAM, 1.000x CIMORY SUSU, 1.000x ICE TEA (FREE)	1	\N	2026-06-16 18:13:29.986759
634	STOP_SESSION	Sistem (Auto-Cutoff Prepaid)	Stop sesi meja MEJA 2. Durasi: 180 menit. Total Billiard: Rp 70,000 | Cafe: Rp 42,000 | SC: Rp 0 | PPN: Rp 0 | Grand Total: Rp 112,000 | Item Cafe: 1.000x SOSIS MERAH, 1.000x LEMON TEA, 2.000x LEMON TEA	2	\N	2026-06-16 18:23:12.380698
635	START_SESSION	kasir2	Mulai meja MEJA 2 (1 JAM WEEKEND) - Tamu: IKHROM	2	\N	2026-06-16 18:53:21.372957
636	BILLIARD_PRICE_OVERRIDE	kasir2	Ubah harga billiard manual dari Rp 30,000 ke Rp 60,000	2	TAB-260616185320	2026-06-16 18:53:33.932684
637	EXTEND_SESSION	kasir2	Tambah waktu meja MEJA 2 selama 60 menit. Tambahan biaya: Rp 30,000	2	\N	2026-06-16 18:53:34.966414
638	ADD_MENU	kasir2	Menambahkan 1x AIR MINERAL ke MEJA 2	2	\N	2026-06-16 18:54:34.292583
639	ADD_MENU	kasir2	Menambahkan 1x AIR MINERAL ke MEJA 2	2	\N	2026-06-16 18:55:39.283139
641	ADD_MENU	kasir2	Menambahkan 1x ICE TEA (FREE) ke MEJA 6	6	\N	2026-06-16 18:58:51.718755
640	START_SESSION	kasir2	Mulai meja MEJA 6 (3 JAM WEEKEND) - Tamu: SALOM	6	\N	2026-06-16 18:56:07.936287
642	ADD_MENU	kasir2	Menambahkan 1x KOPI HITAM ke MEJA 6	6	\N	2026-06-16 19:09:28.77995
643	START_SESSION	kasir2	Mulai meja MEJA 1 (1 JAM WEEKEND) - Tamu: IAN	1	\N	2026-06-16 19:21:31.358647
644	START_SESSION	kasir2	Mulai meja MEJA 7 (1 JAM WEEKEND) - Tamu: DIDIK	7	\N	2026-06-16 19:22:38.507201
645	BILLIARD_PRICE_OVERRIDE	kasir2	Ubah harga billiard manual dari Rp 30,000 ke Rp 60,000	7	TAB-260616192238	2026-06-16 19:22:45.106334
646	EXTEND_SESSION	kasir2	Tambah waktu meja MEJA 7 selama 60 menit. Tambahan biaya: Rp 30,000	7	\N	2026-06-16 19:22:45.186423
647	START_SESSION	kasir2	Mulai meja MEJA 3 (1 JAM WEEKEND) - Tamu: JAPA	3	\N	2026-06-16 19:33:27.258692
648	BILLIARD_PRICE_OVERRIDE	kasir2	Ubah harga billiard manual dari Rp 30,000 ke Rp 60,000	3	TAB-260616193327	2026-06-16 19:33:30.752648
649	EXTEND_SESSION	kasir2	Tambah waktu meja MEJA 3 selama 60 menit. Tambahan biaya: Rp 30,000	3	\N	2026-06-16 19:33:30.827121
650	ADD_MENU	kasir2	Menambahkan 1x MILO DINO ke MEJA 3	3	\N	2026-06-16 19:33:50.152869
651	START_SESSION	kasir2	Mulai meja MEJA 4 (OPEN TABLE WEEKEND) - Tamu: ALPAN	4	\N	2026-06-16 19:35:19.656291
652	ADD_MENU	kasir2	Menambahkan 1x NASI GORENG JAWA ke 1	1	\N	2026-06-16 20:02:30.617748
653	ADD_MENU	kasir2	Menambahkan 1x CAPPUCINNO ke 1	1	\N	2026-06-16 20:02:43.280763
654	STOP_SESSION	Sistem (Auto-Cutoff Prepaid)	Stop sesi meja MEJA 1. Durasi: 60 menit. Total Billiard: Rp 30,000 | Cafe: Rp 0 | SC: Rp 0 | PPN: Rp 0 | Grand Total: Rp 30,000	1	\N	2026-06-16 20:21:31.55828
655	START_SESSION	kasir2	Mulai meja MEJA 1 (1 JAM WEEKEND) - Tamu: NOPAL	1	\N	2026-06-16 20:28:57.77988
656	BILLIARD_PRICE_OVERRIDE	kasir2	Ubah harga billiard manual dari Rp 30,000 ke Rp 60,000	1	TAB-260616202857	2026-06-16 20:29:06.575059
657	EXTEND_SESSION	kasir2	Tambah waktu meja MEJA 1 selama 60 menit. Tambahan biaya: Rp 30,000	1	\N	2026-06-16 20:29:06.654904
658	START_SESSION	kasir2	Mulai meja MEJA 8 (1 JAM WEEKEND) - Tamu: ARIF	8	\N	2026-06-16 20:33:30.412666
659	BILLIARD_PRICE_OVERRIDE	kasir2	Ubah harga billiard manual dari Rp 30,000 ke Rp 60,000	8	TAB-260616203330	2026-06-16 20:33:38.208303
660	EXTEND_SESSION	kasir2	Tambah waktu meja MEJA 8 selama 60 menit. Tambahan biaya: Rp 30,000	8	\N	2026-06-16 20:33:38.372024
661	ADD_MENU	kasir2	Menambahkan 2x TARO ke MEJA 8	8	\N	2026-06-16 20:33:55.405324
662	ADD_MENU	kasir2	Menambahkan 1x HAND GLOVE ke MEJA 8	8	\N	2026-06-16 20:34:08.503837
663	ADD_MENU	kasir2	Menambahkan 1x AIR MINERAL ke MEJA 8	8	\N	2026-06-16 20:36:09.060628
664	STOP_SESSION	Sistem (Auto-Cutoff Prepaid)	Stop sesi meja MEJA 2. Durasi: 120 menit. Total Billiard: Rp 60,000 | Cafe: Rp 12,000 | SC: Rp 0 | PPN: Rp 0 | Grand Total: Rp 72,000 | Item Cafe: 1.000x AIR MINERAL, 1.000x AIR MINERAL	2	\N	2026-06-16 20:53:22.702166
665	MOVE_TABLE	kasir2	Move Table Billiard Meja MEJA 4 ke Meja MEJA 5. Total Rp 42,500	5	\N	2026-06-16 21:00:02.920825
666	MOVE_TABLE	kasir2	Move Table Billiard Meja MEJA 5 ke Meja MEJA 4. Total Rp 43,000	4	\N	2026-06-16 21:00:39.714826
667	MOVE_TABLE	kasir2	Move Table Billiard Meja MEJA 8 ke Meja MEJA 5. Total Rp 116,000	5	\N	2026-06-16 21:00:47.163979
668	START_SESSION	kasir2	Mulai meja MEJA 8 (1 JAM WEEKEND) - Tamu: SLIM	8	\N	2026-06-16 21:05:53.661441
669	START_SESSION	kasir2	Mulai meja MEJA 2 (OPEN TABLE WEEKEND) - Tamu: UNYIL	2	\N	2026-06-16 21:14:08.932992
670	ADD_MENU	kasir2	Menambahkan 1x PANDAN COFFE, 1x TARO ke MEJA 2	2	\N	2026-06-16 21:14:35.62322
671	ADD_MENU	kasir2	Menambahkan 1x COOKIES & CREAM ke MEJA 2	2	\N	2026-06-16 21:15:41.758972
672	ADD_MENU	kasir2	Menambahkan 2x ICE TEA ke MEJA 2	2	\N	2026-06-16 21:16:07.426564
673	STOP_SESSION	kasir2	Stop sesi meja MEJA 7. Durasi: 116 menit. Total Billiard: Rp 60,000 | Cafe: Rp 0 | SC: Rp 0 | PPN: Rp 0 | Grand Total: Rp 60,000	7	\N	2026-06-16 21:18:52.806075
674	ADD_MENU	kasir2	Menambahkan 1x LEMON TEA, 1x ICE TEA ke 2	2	\N	2026-06-16 21:31:19.876065
675	STOP_SESSION	Sistem (Auto-Cutoff Prepaid)	Stop sesi meja MEJA 3. Durasi: 120 menit. Total Billiard: Rp 60,000 | Cafe: Rp 15,000 | SC: Rp 0 | PPN: Rp 0 | Grand Total: Rp 75,000 | Item Cafe: 1.000x MILO DINO	3	\N	2026-06-16 21:33:27.477966
676	STOP_SESSION	Sistem (Auto-Cutoff Prepaid)	Stop sesi meja MEJA 6. Durasi: 180 menit. Total Billiard: Rp 85,000 | Cafe: Rp 10,000 | SC: Rp 0 | PPN: Rp 0 | Grand Total: Rp 95,000 | Item Cafe: 1.000x KOPI HITAM, 1.000x ICE TEA (FREE)	6	\N	2026-06-16 21:56:08.647373
677	START_SESSION	kasir2	Mulai meja MEJA 3 (1 JAM WEEKEND) - Tamu: AKBAR	3	\N	2026-06-16 22:04:17.950679
678	STOP_SESSION	Sistem (Auto-Cutoff Prepaid)	Stop sesi meja MEJA 8. Durasi: 60 menit. Total Billiard: Rp 30,000 | Cafe: Rp 0 | SC: Rp 0 | PPN: Rp 0 | Grand Total: Rp 30,000	8	\N	2026-06-16 22:05:54.1676
679	START_SESSION	kasir2	Mulai meja MEJA 6 (1 JAM WEEKEND) - Tamu: WILDAN	6	\N	2026-06-16 22:23:40.635334
680	BILLIARD_PRICE_OVERRIDE	kasir2	Ubah harga billiard manual dari Rp 30,000 ke Rp 60,000	6	TAB-260616222340	2026-06-16 22:23:44.921508
681	EXTEND_SESSION	kasir2	Tambah waktu meja MEJA 6 selama 60 menit. Tambahan biaya: Rp 30,000	6	\N	2026-06-16 22:23:45.100212
682	STOP_SESSION	Sistem (Auto-Cutoff Prepaid)	Stop sesi meja MEJA 1. Durasi: 120 menit. Total Billiard: Rp 60,000 | Cafe: Rp 0 | SC: Rp 0 | PPN: Rp 0 | Grand Total: Rp 60,000	1	\N	2026-06-16 22:28:58.077853
683	STOP_SESSION	Sistem (Auto-Cutoff Prepaid)	Stop sesi meja MEJA 5. Durasi: 120 menit. Total Billiard: Rp 60,000 | Cafe: Rp 56,000 | SC: Rp 0 | PPN: Rp 0 | Grand Total: Rp 116,000 | Item Cafe: 1.000x AIR MINERAL, 2.000x TARO, 1.000x HAND GLOVE	5	\N	2026-06-16 22:33:30.886414
684	STOP_SESSION	kasir2	Stop sesi meja MEJA 3. Durasi: 58 menit. Total Billiard: Rp 30,000 | Cafe: Rp 0 | SC: Rp 0 | PPN: Rp 0 | Grand Total: Rp 30,000	3	\N	2026-06-16 23:01:56.704948
685	START_SESSION	kasir2	Mulai meja MEJA 5 (1 JAM WEEKEND) - Tamu: AMIR	5	\N	2026-06-16 23:35:10.09953
686	BILLIARD_PRICE_OVERRIDE	kasir2	Ubah harga billiard manual dari Rp 30,000 ke Rp 60,000	5	TAB-260616233509	2026-06-16 23:35:20.286728
687	EXTEND_SESSION	kasir2	Tambah waktu meja MEJA 5 selama 60 menit. Tambahan biaya: Rp 30,000	5	\N	2026-06-16 23:35:20.387889
688	ADD_MENU	kasir2	Menambahkan 1x LEMON TEA ke MEJA 5	5	\N	2026-06-16 23:35:40.176254
689	ADD_MENU	kasir2	Menambahkan 1x AIR MINERAL ke MEJA 5	5	\N	2026-06-16 23:38:05.518838
690	BILLIARD_PRICE_OVERRIDE	kasir2	Ubah harga billiard manual dari Rp 30,000 ke Rp 128,000	4	TAB-260616193519	2026-06-16 23:51:09.828326
691	STOP_SESSION	kasir2	Stop sesi meja MEJA 4. Durasi: 256 menit. Total Billiard: Rp 128,000 | Cafe: Rp 0 | SC: Rp 0 | PPN: Rp 0 | Grand Total: Rp 128,000	4	\N	2026-06-16 23:51:10.311826
692	STOP_SESSION	Sistem (Auto-Cutoff Prepaid)	Stop sesi meja MEJA 6. Durasi: 120 menit. Total Billiard: Rp 60,000 | Cafe: Rp 0 | SC: Rp 0 | PPN: Rp 0 | Grand Total: Rp 60,000	6	\N	2026-06-17 00:23:40.608771
693	ADD_MENU	kasir2	Menambahkan 1x LYCHEE TEA ke MEJA 5	5	\N	2026-06-17 00:26:38.334452
694	BILLIARD_PRICE_OVERRIDE	kasir2	Ubah harga billiard manual dari Rp 30,000 ke Rp 97,500	2	TAB-260616211408	2026-06-17 00:28:11.571483
695	STOP_SESSION	kasir2	Stop sesi meja MEJA 2. Durasi: 194 menit. Total Billiard: Rp 97,500 | Cafe: Rp 59,000 | SC: Rp 0 | PPN: Rp 0 | Grand Total: Rp 156,500 | Item Cafe: 2.000x ICE TEA, 1.000x TARO, 1.000x COOKIES & CREAM, 1.000x PANDAN COFFE	2	\N	2026-06-17 00:28:11.786605
696	STOP_SESSION	Sistem (Auto-Cutoff Prepaid)	Stop sesi meja MEJA 5. Durasi: 120 menit. Total Billiard: Rp 60,000 | Cafe: Rp 26,000 | SC: Rp 0 | PPN: Rp 0 | Grand Total: Rp 86,000 | Item Cafe: 1.000x AIR MINERAL, 1.000x LYCHEE TEA, 1.000x LEMON TEA	5	\N	2026-06-17 01:35:10.705579
697	UPDATE_SETTINGS	0	Ubah pengaturan: businessDayOffset: "07:00" -> "04:00", availablePaymentMethods: ["CASH","Qris","TRANSFER","GoPay","DANA","OVO","BCA","MANDIRI","BRI","BNI","SEABANK","SHOPEEPAY"] -> ["CASH","Qris","TRANSFER","GoPay","DANA","OVO","BCA","MANDIRI","BRI","BNI","SEABANK","SHOPEEPAY"], customPricingDynamic: [{"categoryId":1,"basePrice":0,"timeSlots":[{"start":"10:00","end":"18:00","price":35000},{"start":"18:00","end":"02:00","price":"45000"},{"start":"02:00","end":"10:00","price":"45000"}]},{"categoryId":2,"basePrice":0,"timeSlots":[{"start":"10:00","end":"18:00","price":"25000"},{"start":"18:00","end":"02:00","price":"35000"},{"start":"02:00","end":"10:00","price":"35000"}]},{"categoryId":3,"basePrice":0,"timeSlots":[{"start":"10:00","end":"17:00","price":"20000"},{"start":"17:00","end":"02:00","price":"30000"},{"start":"02:00","end":"10:00","price":"30000"}]}] -> [{"categoryId":1,"basePrice":0,"timeSlots":[{"start":"10:00","end":"18:00","price":35000},{"start":"18:00","end":"02:00","price":"45000"},{"start":"02:00","end":"10:00","price":"45000"}]},{"categoryId":2,"basePrice":0,"timeSlots":[{"start":"10:00","end":"18:00","price":"25000"},{"start":"18:00","end":"02:00","price":"35000"},{"start":"02:00","end":"10:00","price":"35000"}]},{"categoryId":3,"basePrice":0,"timeSlots":[{"start":"10:00","end":"17:00","price":"20000"},{"start":"17:00","end":"02:00","price":"30000"},{"start":"02:00","end":"10:00","price":"30000"}]}], availableShifts: [{"name":"SHIFT 1","startTime":"10:00","endTime":"18:00"},{"name":"SHIFT 2","startTime":"18:00","endTime":"02:00"},{"name":"OVERTIME","startTime":"02:00","endTime":"10:00"}] -> [{"name":"SHIFT 1","startTime":"10:00","endTime":"18:00"},{"name":"SHIFT 2","startTime":"18:00","endTime":"02:00"},{"name":"OVERTIME","startTime":"02:00","endTime":"10:00"}], approvalConfig: {"WASTE":[1,2],"EXPENSE":[1,2],"STOCK_UPDATE":[1,2],"PENALTY":[1,2],"CLOSING":[1,2],"DATA_EDIT":[1,2]} -> {"WASTE":[1,2],"EXPENSE":[1,2],"STOCK_UPDATE":[1,2],"PENALTY":[1,2],"CLOSING":[1,2],"DATA_EDIT":[1,2]}, bounceBackConfig: [{"tierName":"Tier 1 - Pelanggan Reguler","minAmount":5000000,"maxAmount":100000,"rewardType":"FREE_ITEM","rewardValue":1,"minClaimTransaction":0,"expiryDays":7},{"tierName":"Tier 2 - Pelanggan Setia","minAmount":10000000,"maxAmount":250000,"rewardType":"DISCOUNT_FIXED","rewardValue":15000,"minClaimTransaction":50000,"expiryDays":14},{"tierName":"Tier 3 - Pelanggan VIP","minAmount":20000000,"maxAmount":99999999,"rewardType":"FREE_BILLIARD_MINUTES","rewardValue":60,"minClaimTransaction":0,"expiryDays":30}] -> [{"tierName":"Tier 1 - Pelanggan Reguler","minAmount":5000000,"maxAmount":100000,"rewardType":"FREE_ITEM","rewardValue":1,"minClaimTransaction":0,"expiryDays":7},{"tierName":"Tier 2 - Pelanggan Setia","minAmount":10000000,"maxAmount":250000,"rewardType":"DISCOUNT_FIXED","rewardValue":15000,"minClaimTransaction":50000,"expiryDays":14},{"tierName":"Tier 3 - Pelanggan VIP","minAmount":20000000,"maxAmount":99999999,"rewardType":"FREE_BILLIARD_MINUTES","rewardValue":60,"minClaimTransaction":0,"expiryDays":30}]	\N	\N	2026-06-17 02:41:18.853869
698	STOCK_ADJUSTMENT	kasir2	Penambahan stok manual untuk "WATER LEMON SPRITE" sebesar 10200 Ml. Stok lama: 1275 -> Baru: 11475.000 | Alasan: BARANG DATANG (Approved)	\N	\N	2026-06-17 02:41:24.921224
\.


--
-- Data for Name: battle_plan_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.battle_plan_items (id, "battlePlanId", "menuItemId", "packageId", "promoId", "targetQuantity", "soldQuantity", "aiLabel", "isAutoBroadcastEnabled") FROM stdin;
57	2	67	\N	\N	10	1	📦 OVERSTOCK	f
30	2	54	\N	\N	10	1	📦 OVERSTOCK	f
10	1	\N	10	\N	10	0	🚀 Upsell	f
11	1	\N	17	\N	10	0	🚀 Upsell	f
12	1	\N	9	\N	10	0	🚀 Upsell	f
14	1	\N	14	\N	3	0	🚀 Upsell	f
9	1	\N	16	\N	10	1	🚀 Upsell	f
8	1	\N	15	\N	10	2	🚀 Upsell	f
13	1	\N	19	\N	10	1	🚀 Upsell	f
202	4	24	\N	\N	10	0	✨ NORMAL	f
203	4	52	\N	\N	10	0	📦 OVERSTOCK	f
58	2	\N	19	\N	1	1	✨ NORMAL	f
204	4	35	\N	\N	1	0	✨ NORMAL	f
56	2	66	\N	\N	10	0	📦 OVERSTOCK	f
55	2	68	\N	\N	3	0	✨ NORMAL	f
54	2	69	\N	\N	7	0	✨ NORMAL	f
53	2	70	\N	\N	10	0	📦 OVERSTOCK	f
52	2	71	\N	\N	10	0	📦 OVERSTOCK	f
46	2	60	\N	\N	10	0	📦 OVERSTOCK	f
34	2	58	\N	\N	10	0	📦 OVERSTOCK	f
32	2	56	\N	\N	10	0	📦 OVERSTOCK	f
31	2	55	\N	\N	10	0	📦 OVERSTOCK	f
205	4	32	\N	\N	3	0	✨ NORMAL	f
29	2	53	\N	\N	10	0	📦 OVERSTOCK	f
45	2	19	\N	\N	10	0	📦 OVERSTOCK	f
44	2	20	\N	\N	10	0	📦 OVERSTOCK	f
43	2	21	\N	\N	10	0	✨ NORMAL	f
42	2	22	\N	\N	10	0	📦 OVERSTOCK	f
41	2	23	\N	\N	2	0	✨ NORMAL	f
39	2	32	\N	\N	10	0	✨ NORMAL	f
38	2	35	\N	\N	1	0	✨ NORMAL	f
37	2	24	\N	\N	10	0	✨ NORMAL	f
36	2	25	\N	\N	10	0	✨ NORMAL	f
35	2	26	\N	\N	10	0	✨ NORMAL	f
40	2	59	\N	\N	10	0	📦 OVERSTOCK	f
33	2	40	\N	\N	14	0	📦 OVERSTOCK	f
51	2	28	\N	\N	10	0	✨ NORMAL	f
50	2	27	\N	\N	10	0	✨ NORMAL	f
49	2	29	\N	\N	1	0	✨ NORMAL	f
48	2	36	\N	\N	5	0	✨ NORMAL	f
47	2	33	\N	\N	5	0	✨ NORMAL	f
206	4	22	\N	\N	1	0	📦 OVERSTOCK	f
193	4	14	\N	\N	10	14	📦 OVERSTOCK	f
195	4	39	\N	\N	10	8	📦 OVERSTOCK	f
197	4	41	\N	\N	7	4	✨ NORMAL	f
194	4	31	\N	\N	3	2	✨ NORMAL	f
198	4	40	\N	\N	31	12	📦 OVERSTOCK	f
232	5	51	\N	\N	10	0	🚀 Upsell	f
233	5	50	\N	\N	10	0	🚀 Upsell	f
234	5	49	\N	\N	10	0	🚀 Upsell	f
235	5	33	\N	\N	4	0	🚀 Upsell	f
236	5	36	\N	\N	4	0	🚀 Upsell	f
237	5	27	\N	\N	10	0	🚀 Upsell	f
238	5	28	\N	\N	10	0	🚀 Upsell	f
239	5	14	\N	\N	10	0	🚀 Upsell	f
240	5	31	\N	\N	3	0	🚀 Upsell	f
241	5	39	\N	\N	10	0	🚀 Upsell	f
242	5	38	\N	\N	7	0	🚀 Upsell	f
186	4	51	\N	\N	10	0	📦 OVERSTOCK	f
187	4	50	\N	\N	10	0	📦 OVERSTOCK	f
188	4	49	\N	\N	10	0	📦 OVERSTOCK	f
189	4	33	\N	\N	4	0	✨ NORMAL	f
190	4	36	\N	\N	4	0	✨ NORMAL	f
191	4	27	\N	\N	10	0	✨ NORMAL	f
192	4	28	\N	\N	10	0	✨ NORMAL	f
196	4	38	\N	\N	7	0	✨ NORMAL	f
199	4	59	\N	\N	10	2	✨ NORMAL	f
200	4	26	\N	\N	10	2	✨ NORMAL	f
201	4	25	\N	\N	10	0	✨ NORMAL	f
243	5	41	\N	\N	7	0	🚀 Upsell	f
244	5	40	\N	\N	31	0	🚀 Upsell	f
245	5	59	\N	\N	10	0	🚀 Upsell	f
246	5	26	\N	\N	10	0	🚀 Upsell	f
247	5	25	\N	\N	10	0	🚀 Upsell	f
248	5	24	\N	\N	10	0	🚀 Upsell	f
249	5	52	\N	\N	10	0	🚀 Upsell	f
250	5	35	\N	\N	1	0	🚀 Upsell	f
251	5	32	\N	\N	9	0	🚀 Upsell	f
138	3	51	\N	\N	10	0	🚀 Upsell	f
139	3	50	\N	\N	10	0	🚀 Upsell	f
140	3	49	\N	\N	10	0	🚀 Upsell	f
141	3	33	\N	\N	4	1	🚀 Upsell	f
142	3	36	\N	\N	4	1	🚀 Upsell	f
143	3	29	\N	\N	1	0	🚀 Upsell	f
144	3	27	\N	\N	10	0	🚀 Upsell	f
145	3	28	\N	\N	10	0	🚀 Upsell	f
146	3	14	\N	\N	10	0	🚀 Upsell	f
147	3	31	\N	\N	4	2	🚀 Upsell	f
148	3	39	\N	\N	10	0	🚀 Upsell	f
149	3	38	\N	\N	7	0	🚀 Upsell	f
150	3	41	\N	\N	9	0	🚀 Upsell	f
151	3	40	\N	\N	24	15	🚀 Upsell	f
152	3	59	\N	\N	10	3	🚀 Upsell	f
153	3	26	\N	\N	10	0	🚀 Upsell	f
154	3	25	\N	\N	10	0	🚀 Upsell	f
155	3	24	\N	\N	10	1	🚀 Upsell	f
156	3	52	\N	\N	10	0	🚀 Upsell	f
157	3	35	\N	\N	1	0	🚀 Upsell	f
158	3	32	\N	\N	10	0	🚀 Upsell	f
159	3	23	\N	\N	2	0	🚀 Upsell	f
160	3	22	\N	\N	10	0	🚀 Upsell	f
161	3	21	\N	\N	10	1	🚀 Upsell	f
162	3	20	\N	\N	10	0	🚀 Upsell	f
163	3	19	\N	\N	1	0	🚀 Upsell	f
164	3	\N	19	\N	2	0	🚀 Upsell	f
252	5	23	\N	\N	1	0	🚀 Upsell	f
253	5	22	\N	\N	10	0	🚀 Upsell	f
254	5	21	\N	\N	10	0	🚀 Upsell	f
255	5	20	\N	\N	10	0	🚀 Upsell	f
256	5	\N	22	\N	1	0	🚀 Upsell	f
257	6	51	\N	\N	10	0	📦 OVERSTOCK	f
258	6	50	\N	\N	10	0	📦 OVERSTOCK	f
264	6	14	\N	\N	10	3	📦 OVERSTOCK	f
260	6	33	\N	\N	4	0	✨ NORMAL	f
261	6	36	\N	\N	4	0	✨ NORMAL	f
262	6	27	\N	\N	10	0	✨ NORMAL	f
263	6	28	\N	\N	10	0	✨ NORMAL	f
269	6	40	\N	\N	34	5	📦 OVERSTOCK	f
265	6	31	\N	\N	3	0	✨ NORMAL	f
266	6	39	\N	\N	10	0	📦 OVERSTOCK	f
267	6	38	\N	\N	7	0	✨ NORMAL	f
268	6	41	\N	\N	6	0	✨ NORMAL	f
270	6	59	\N	\N	10	0	✨ NORMAL	f
271	6	26	\N	\N	10	0	✨ NORMAL	f
272	6	25	\N	\N	10	0	✨ NORMAL	f
273	6	24	\N	\N	6	0	✨ NORMAL	f
274	6	52	\N	\N	9	0	📦 OVERSTOCK	f
259	6	49	\N	\N	10	1	📦 OVERSTOCK	f
\.


--
-- Data for Name: battle_plans; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.battle_plans (id, "businessDayId", "targetRevenue", "predictedRevenue", status, "aiStrategyBrief", "createdAt", "updatedAt") FROM stdin;
1	1	1875000.00	0.00	DRAFT	Target Rev: Rp 1,875,000. Est. 25 pax (Avg: Rp 75,000). Trafik diprediksi stabil sepanjang hari. Prioritaskan 7 Paket Billiard untuk filling occupancy.	2026-06-12 07:00:00.448459	2026-06-12 07:00:00.654612
2	2	3000000.00	0.00	PUBLISHED	Target Rev: Rp 1,848,996. Est. 36 pax (Avg: Rp 51,361). Trafik diprediksi stabil sepanjang hari. Prioritaskan 7 Paket Billiard untuk filling occupancy.	2026-06-13 07:00:00.319168	2026-06-14 02:51:25.151408
3	3	2339710.00	0.00	DRAFT	Target Rev: Rp 2,339,710. Est. 34 pax (Avg: Rp 68,815). Trafik diprediksi stabil sepanjang hari. Prioritaskan 1 Paket Billiard untuk filling occupancy.	2026-06-14 07:00:00.404566	2026-06-15 07:00:01.227353
4	4	1950000.00	0.00	PUBLISHED	\N	2026-06-15 18:22:46.293158	2026-06-15 18:22:46.538952
5	5	2272809.00	0.00	DRAFT	Target Rev: Rp 2,272,809. Est. 33 pax (Avg: Rp 68,873). Trafik diprediksi stabil sepanjang hari. Prioritaskan 1 Paket Billiard untuk filling occupancy.	2026-06-16 07:00:00.555202	2026-06-16 07:00:01.046703
6	7	1850000.00	0.00	PUBLISHED	\N	2026-06-16 16:16:04.766508	2026-06-16 16:16:05.099517
\.


--
-- Data for Name: billiard_packages; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.billiard_packages (id, name, "categoryId", type, "durationMinutes", price, "minutePrice", "timeSlots", "isActive", "createdAt", "updatedAt", "validDays") FROM stdin;
8	3 JAM WEEKDAYS	3	fixed	180	0.00	\N	[{"start":"10:00","end":"17:00","price":"53000"},{"start":"17:00","end":"02:00","price":"77000"},{"start":"02:00","end":"10:00","price":"77000"}]	t	2026-06-12 02:59:49.838691	2026-06-12 16:50:40.404241	MON,TUE,WED,THU
13	3 JAM WEEKEND	3	fixed	180	0.00	\N	[{"start":"10:00","end":"17:00","price":"55000"},{"start":"17:00","end":"02:00","price":"85000"},{"start":"02:00","end":"10:00","price":"85000"}]	t	2026-06-12 04:23:17.904691	2026-06-16 02:11:50.829458	SAT,SUN,FRI,TUE
6	1 JAM WEEKDAYS	3	fixed	60	0.00	\N	[{"start":"10:00","end":"17:00","price":"20000"},{"start":"17:00","end":"02:00","price":"25000"},{"start":"02:00","end":"10:00","price":"25000"}]	t	2026-06-12 02:57:56.402711	2026-06-12 16:51:11.993006	MON,TUE,WED,THU
21	1 JAM WEEKEND 	1	fixed	60	0.00	\N	[{"start":"10:00","end":"17:00","price":"35000"},{"start":"17:00","end":"02:00","price":"45000"},{"start":"02:00","end":"10:00","price":"45000"}]	t	2026-06-14 21:58:23.892001	2026-06-16 02:12:01.054297	FRI,SAT,SUN,TUE
10	3 JAM WEEKDAYS	1	fixed	180	0.00	\N	[{"start":"10:00","end":"17:00","price":"10000"},{"start":"18:00","end":"02:00","price":"115000"},{"start":"02:00","end":"10:00","price":"115000"}]	t	2026-06-12 03:03:42.064357	2026-06-12 16:54:30.268097	MON,TUE,WED,THU
5	OPEN TABLE WEEKDAYS	3	hourly	120	0.00	\N	[{"start":"10:00","end":"17:00","price":"20000"},{"start":"17:00","end":"02:00","price":"25000"},{"start":"02:00","end":"10:00","price":"25000"}]	t	2026-06-12 02:57:26.926031	2026-06-12 16:51:26.356191	MON,TUE,WED,THU
2	1 JAM WEEKDAYS	1	fixed	60	0.00	\N	[{"start":"10:00","end":"17:00","price":"35000"},{"start":"17:00","end":"02:00","price":"40000"},{"start":"02:00","end":"10:00","price":"40000"}]	t	2026-06-12 02:53:47.537025	2026-06-12 16:54:46.052561	MON,TUE,WED,THU
9	3 JAM WEEKDAYS	2	fixed	180	0.00	\N	[{"start":"10:00","end":"17:00","price":"70000"},{"start":"17:00","end":"02:00","price":"85000"},{"start":"02:00","end":"10:00","price":"85000"}]	t	2026-06-12 03:02:56.681163	2026-06-12 16:52:23.228257	MON,TUE,WED,THU
1	OPEN TABLE WEEKDAYS	1	hourly	120	0.00	\N	[{"start":"10:00","end":"17:00","price":"35000"},{"start":"17:00","end":"02:00","price":"40000"},{"start":"02:00","end":"10:00","price":"40000"}]	t	2026-06-12 02:53:04.404711	2026-06-12 16:56:11.497873	MON,TUE,WED,THU
19	3 JAM WEEKEND	1	fixed	180	0.00	\N	[{"start":"10:00","end":"17:00","price":"100000"},{"start":"17:00","end":"02:00","price":"130000"},{"start":"02:00","end":"10:00","price":"130000"}]	t	2026-06-12 04:28:23.036463	2026-06-16 02:12:07.535214	SAT,SUN,FRI,TUE
17	OPEN TABLE WEEKEND	1	hourly	120	0.00	\N	[{"start":"10:00","end":"17:00","price":"35000"},{"start":"17:00","end":"02:00","price":"45000"},{"start":"02:00","end":"10:00","price":"45000"}]	t	2026-06-12 04:27:03.417107	2026-06-16 02:12:15.233779	SAT,SUN,FRI,TUE
14	OPEN TABLE WEEKEND	2	hourly	120	0.00	\N	[{"start":"10:00","end":"17:00","price":"25000"},{"start":"17:00","end":"02:00","price":"35000"},{"start":"02:00","end":"10:00","price":"35000"}]	t	2026-06-12 04:24:30.272037	2026-06-16 02:12:24.745439	SAT,SUN,FRI,TUE
16	3 JAM WEEKEND	2	fixed	180	0.00	\N	[{"start":"10:00","end":"17:00","price":"70000"},{"start":"17:00","end":"02:00","price":"100000"},{"start":"02:00","end":"10:00","price":"100000"}]	t	2026-06-12 04:26:28.873851	2026-06-16 02:12:31.311086	SAT,SUN,FRI,TUE
15	1 JAM WEEKEND	2	fixed	60	0.00	\N	[{"start":"10:00","end":"17:00","price":"25000"},{"start":"17:00","end":"02:00","price":"35000"},{"start":"02:00","end":"18:00","price":"35000"}]	t	2026-06-12 04:25:11.527332	2026-06-16 02:12:37.096522	SAT,SUN,FRI,TUE
7	2 JAM WEEKDAYS	3	fixed	120	0.00	\N	[{"start":"10:00","end":"17:00","price":"35000"},{"start":"17:00","end":"02:00","price":"50000"},{"start":"02:00","end":"10:00","price":"50000"}]	t	2026-06-12 02:59:09.860926	2026-06-15 23:53:01.609813	MON,TUE,WED,THU
11	OPEN TABLE WEEKEND	3	hourly	120	0.00	\N	[{"start":"10:00","end":"17:00","price":"20000"},{"start":"17:00","end":"02:00","price":"30000"},{"start":"02:00","end":"10:00","price":"30000"}]	t	2026-06-12 04:21:49.978378	2026-06-16 02:13:32.309068	SAT,SUN,FRI,TUE
4	1 JAM WEEKDAYS	2	fixed	60	0.00	\N	[{"start":"10:00","end":"17:00","price":"25000"},{"start":"17:00","end":"02:00","price":"30000"},{"start":"02:00","end":"10:00","price":"30000"}]	t	2026-06-12 02:56:29.470083	2026-06-12 16:52:56.741851	MON,TUE,WED,THU
3	OPEN TABLE WEEKDAYS	2	hourly	120	0.00	\N	[{"start":"10:00","end":"17:00","price":"25000"},{"start":"17:00","end":"02:00","price":"30000"},{"start":"02:00","end":"10:00","price":"30000"}]	t	2026-06-12 02:55:08.87147	2026-06-12 16:53:10.548858	MON,TUE,WED,THU
22	1 JAM WEEKEND	3	fixed	60	0.00	\N	[{"start":"10:00","end":"17:00","price":"20000"},{"start":"17:00","end":"02:00","price":"30000"},{"start":"02:00","end":"10:00","price":"30000"}]	t	2026-06-15 15:01:41.458936	2026-06-16 02:11:29.534682	FRI,SAT,SUN,TUE
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
4	2026-06-15	2026-06-15 07:00:01.342	2026-06-16 04:21:23.435	t	1934500.00	0.00	0.00	t	2026-06-15 07:00:01.34309
5	2026-06-15	2026-06-16 04:21:23.846	2026-06-16 07:00:01.055	t	0.00	0.00	0.00	f	2026-06-16 04:21:23.847645
7	2026-06-16	2026-06-16 07:00:01.12	2026-06-17 02:40:15.577	t	1832500.00	0.00	0.00	t	2026-06-16 07:00:01.120516
3	2026-06-14	2026-06-14 04:00:29.915	2026-06-15 07:00:01.25	t	2630700.00	0.00	0.00	t	2026-06-14 04:00:29.916135
2	2026-06-13	2026-06-13 03:45:56.353	2026-06-14 04:00:29.889	t	2608200.00	0.00	0.00	t	2026-06-13 03:45:56.355008
6	2026-06-16	2026-06-16 07:00:01.102	2026-06-17 04:00:01.372	t	0.00	0.00	0.00	f	2026-06-16 07:00:01.103352
8	2026-06-17	2026-06-17 04:00:01.677	\N	f	0.00	0.00	0.00	f	2026-06-17 04:00:01.677764
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
2	2	4	available	\N	\N	f	\N	\N	2026-06-12 05:40:57.020304	2026-06-16 21:55:42.645789	\N
1	1	4	available	\N	\N	f	\N	\N	2026-06-12 05:40:50.744268	2026-06-16 22:06:13.88559	\N
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
37	20000.00	in	sale:billiard	TAB-260613102107	Payment INV: TAB-260613102107 (CASH)	CASH	2026-06-13 12:03:18.396	1869000.00	2	3
38	61000.00	in	sale:billiard	TAB-260613110242	Payment INV: TAB-260613110242 (CASH)	CASH	2026-06-13 14:06:02.701	1930000.00	2	3
39	55000.00	in	sale:billiard	TAB-260613135801	Payment INV: TAB-260613135801 (CASH)	CASH	2026-06-13 16:00:09.906	1985000.00	2	3
40	36000.00	in	sale:billiard	TAB-260613182118	Payment INV: TAB-260613182118 (QRIS)	QRIS	2026-06-13 19:22:31.419	2021000.00	2	4
41	72000.00	in	sale:billiard	TAB-260613180509	Payment INV: TAB-260613180509 (CASH)	CASH	2026-06-13 20:07:01.973	2093000.00	2	4
42	66000.00	in	sale:billiard	TAB-260613194620	Payment INV: TAB-260613194620 (CASH)	CASH	2026-06-13 21:47:40.862	2159000.00	2	4
43	72000.00	in	sale:billiard	TAB-260613200046	Payment INV: TAB-260613200046 (CASH)	CASH	2026-06-13 22:03:02.929	2231000.00	2	4
44	92000.00	in	sale:billiard	TAB-260613190904	Payment INV: TAB-260613190904 (CASH)	CASH	2026-06-13 22:10:52.633	2323000.00	2	4
45	92000.00	in	sale:billiard	TAB-260613202550	Payment INV: TAB-260613202550 (CASH)	CASH	2026-06-13 22:27:21.407	2415000.00	2	4
46	95000.00	in	sale:billiard	TAB-260613213846	Payment INV: TAB-260613213846 (QRIS)	QRIS	2026-06-13 22:33:15.205	2510000.00	2	4
47	217000.00	in	sale:billiard	TAB-260613193003	Payment INV: TAB-260613193003 (QRIS)	QRIS	2026-06-13 22:34:39.927	2727000.00	2	4
48	105000.00	in	sale:billiard	TAB-260613193351	Payment INV: TAB-260613193351 (QRIS)	QRIS	2026-06-13 22:34:59.265	2832000.00	2	4
49	70000.00	in	sale:billiard	TAB-260613210821	Payment INV: TAB-260613210821 (CASH)	CASH	2026-06-13 23:10:01.538	2902000.00	2	4
50	86400.00	in	sale:billiard	TAB-260613214427	Payment INV: TAB-260613214427 (CASH)	CASH	2026-06-13 23:39:55.136	2988400.00	2	4
51	35000.00	in	sale:billiard	TAB-260613224418	Payment INV: TAB-260613224418 (CASH)	CASH	2026-06-13 23:45:42.542	3023400.00	2	4
52	86000.00	in	sale:billiard	TAB-260613215538	Payment INV: TAB-260613215538 (CASH)	CASH	2026-06-14 00:02:37.897	3109400.00	2	4
53	103000.00	in	sale:billiard	TAB-260613211621	Payment INV: TAB-260613211621 (QRIS)	QRIS	2026-06-14 00:05:45.519	3212400.00	2	4
54	36000.00	in	sale:billiard	TAB-260613231203	Payment INV: TAB-260613231203 (CASH)	CASH	2026-06-14 00:13:00.896	3248400.00	2	4
55	134000.00	in	sale:billiard	TAB-260613205044	Payment INV: TAB-260613205044 (QRIS)	QRIS	2026-06-14 00:19:32.137	3382400.00	2	4
56	72000.00	in	sale:billiard	TAB-260613222912	Payment INV: TAB-260613222912 (CASH)	CASH	2026-06-14 00:33:16.451	3454400.00	2	4
57	115000.00	in	sale:billiard	TAB-260613220439	Payment INV: TAB-260613220439 (QRIS)	QRIS	2026-06-14 01:06:55.172	3569400.00	2	4
58	100000.00	in	sale:billiard	TAB-260613225323	Split Payment [Payer 1] INV: TAB-260613225323	CASH	2026-06-14 01:08:52.511	3669400.00	2	4
59	168300.00	in	sale:billiard	TAB-260613225323	Payment INV: TAB-260613225323 (QRIS)	QRIS	2026-06-14 01:09:24.78	3837700.00	2	4
60	159000.00	in	sale:billiard	TAB-260613221136	Payment INV: TAB-260613221136 (CASH)	CASH	2026-06-14 01:12:41.658	3996700.00	2	4
61	30000.00	in	sale:billiard	TAB-260613013150	Payment INV: TAB-260613013150 (CASH)	CASH	2026-06-14 02:18:54.61	4026700.00	2	4
62	94500.00	in	sale:billiard	TAB-260613000301	Payment INV: TAB-260613000301 (CASH)	CASH	2026-06-14 02:22:11.843	4121200.00	2	4
63	42500.00	in	sale:billiard	TAB-260613011314	Payment INV: TAB-260613011314 (CASH)	CASH	2026-06-14 02:37:30.593	4163700.00	2	4
64	159500.00	in	sale:billiard	TAB-260613223753	Payment INV: TAB-260613223753 (CASH)	CASH	2026-06-14 02:56:51.713	4323200.00	2	4
65	90000.00	in	sale:billiard	TAB-260613004253	Payment INV: TAB-260613004253 (CASH)	CASH	2026-06-14 03:08:09.651	4413200.00	2	4
66	30000.00	in	sale:billiard	TAB-260613023109	Payment INV: TAB-260613023109 (CASH)	CASH	2026-06-14 03:32:05.521	4443200.00	2	4
67	114000.00	in	sale:billiard	TAB-260613014355	Payment INV: TAB-260613014355 (CASH)	CASH	2026-06-14 04:31:31.362	4557200.00	2	4
68	20000.00	in	sale:billiard	TAB-260614101111	Payment INV: TAB-260614101111 (CASH)	CASH	2026-06-14 11:11:51.065	4577200.00	3	5
69	20000.00	in	sale:billiard	TAB-260614103058	Payment INV: TAB-260614103058 (CASH)	CASH	2026-06-14 11:31:37.468	4597200.00	3	5
70	20000.00	in	sale:billiard	TAB-260614115126	Payment INV: TAB-260614115126 (CASH)	CASH	2026-06-14 12:55:22.816	4617200.00	3	5
71	20000.00	in	sale:billiard	TAB-260614125105	Payment INV: TAB-260614125105 (QRIS)	QRIS	2026-06-14 13:51:48.443	4637200.00	3	5
72	57000.00	in	sale:billiard	TAB-260614132204	Payment INV: TAB-260614132204 (CASH)	CASH	2026-06-14 15:23:14.684	4694200.00	3	5
73	50000.00	in	sale:billiard	TAB-260614150547	Payment INV: TAB-260614150547 (CASH)	CASH	2026-06-14 16:09:04.06	4744200.00	3	5
74	70000.00	in	sale:billiard	TAB-260614141557	Payment INV: TAB-260614141557 (CASH)	CASH	2026-06-14 16:31:13.436	4814200.00	3	5
75	61000.00	in	sale:billiard	TAB-260614140234	Payment INV: TAB-260614140234 (CASH)	CASH	2026-06-14 17:05:26.082	4875200.00	3	5
76	15000.00	in	sale:cafe	CAFE-20260614-0001-100	Payment INV: CAFE-20260614-0001-100 (CASH)	CASH	2026-06-14 17:35:05.864	4890200.00	3	6
77	100000.00	in	sale:billiard	TAB-260614144217	Payment INV: TAB-260614144217 (CASH)	CASH	2026-06-14 17:43:36.29	4990200.00	3	5
78	183200.00	in	sale:billiard	TAB-260614115549	Payment INV: TAB-260614115549 (QRIS)	QRIS	2026-06-14 18:04:41.085	5173400.00	3	5
79	50000.00	in	sale:billiard	TAB-260614161138	Payment INV: TAB-260614161138 (CASH)	CASH	2026-06-14 18:12:06.425	5223400.00	3	5
80	95000.00	in	sale:billiard	TAB-260614153158	Payment INV: TAB-260614153158 (CASH)	CASH	2026-06-14 18:34:12.535	5318400.00	3	5
81	35000.00	in	sale:billiard	TAB-260614183454	Payment INV: TAB-260614183454 (CASH)	CASH	2026-06-14 19:37:40.574	5353400.00	3	6
82	92000.00	in	sale:billiard	TAB-260614181946	Payment INV: TAB-260614181946 (CASH)	CASH	2026-06-14 19:56:46.437	5445400.00	3	6
83	76000.00	in	sale:billiard	TAB-260614183730	Payment INV: TAB-260614183730 (QRIS)	QRIS	2026-06-14 20:41:15.961	5521400.00	3	6
84	101000.00	in	sale:billiard	TAB-260614184338	Payment INV: TAB-260614184338 (CASH)	CASH	2026-06-14 20:45:02.745	5622400.00	3	6
85	100000.00	in	sale:billiard	TAB-260614190002	Payment INV: TAB-260614190002 (CASH)	CASH	2026-06-14 21:00:50.706	5722400.00	3	6
86	100000.00	in	sale:billiard	TAB-260614191845	Payment INV: TAB-260614191845 (CASH)	CASH	2026-06-14 21:20:45.355	5822400.00	3	6
87	107000.00	in	sale:billiard	TAB-260614182623	Payment INV: TAB-260614182623 (QRIS)	QRIS	2026-06-14 21:27:04.869	5929400.00	3	6
88	100000.00	in	sale:billiard	TAB-260614200104	Payment INV: TAB-260614200104 (CASH)	CASH	2026-06-14 21:34:06.665	6029400.00	3	6
89	115000.00	in	sale:billiard	TAB-260614184102	Payment INV: TAB-260614184102 (QRIS)	QRIS	2026-06-14 21:42:20.434	6144400.00	3	6
90	200000.00	in	sale:billiard	TAB-260614192557	Payment INV: TAB-260614192557 (CASH)	CASH	2026-06-14 22:29:17.242	6344400.00	3	6
91	60000.00	in	sale:billiard	TAB-260614204046	Payment INV: TAB-260614204046 (CASH)	CASH	2026-06-14 22:41:59.446	6404400.00	3	6
92	66000.00	in	sale:billiard	TAB-260614204529	Payment INV: TAB-260614204529 (CASH)	CASH	2026-06-14 22:47:03.242	6470400.00	3	6
93	45000.00	in	sale:billiard	TAB-260614220037	Payment INV: TAB-260614220037 (CASH)	CASH	2026-06-14 23:01:30.102	6515400.00	3	6
94	100000.00	in	sale:billiard	TAB-260614220143	Payment INV: TAB-260614220143 (CASH)	CASH	2026-06-14 23:04:15.371	6615400.00	3	6
95	70000.00	in	sale:billiard	TAB-260614230202	Payment INV: TAB-260614230202 (CASH)	CASH	2026-06-15 00:04:27.139	6685400.00	3	6
96	83500.00	in	sale:billiard	TAB-260614220019	Payment INV: TAB-260614220019 (CASH)	CASH	2026-06-15 00:28:08.419	6768900.00	3	6
97	106000.00	in	sale:billiard	TAB-260614210214	Payment INV: TAB-260614210214 (CASH)	CASH	2026-06-15 00:29:15.556	6874900.00	3	6
98	74000.00	in	sale:billiard	TAB-260614223649	Payment INV: TAB-260614223649 (CASH)	CASH	2026-06-15 00:45:52.873	6948900.00	3	6
99	75000.00	in	sale:billiard	TAB-260614230515	Payment INV: TAB-260614230515 (CASH)	CASH	2026-06-15 00:47:03.26	7023900.00	3	6
100	30000.00	in	sale:billiard	TAB-260614001912	Payment INV: TAB-260614001912 (CASH)	CASH	2026-06-15 01:20:48.977	7053900.00	3	6
101	100000.00	in	sale:billiard	TAB-260614233717	Payment INV: TAB-260614233717 (CASH)	CASH	2026-06-15 01:38:47.729	7153900.00	3	6
102	90000.00	in	sale:billiard	TAB-260614001946	Payment INV: TAB-260614001946 (CASH)	CASH	2026-06-15 02:22:35.299	7243900.00	3	6
103	75000.00	in	sale:billiard	TAB-260614004905	Payment INV: TAB-260614004905 (CASH)	CASH	2026-06-15 02:38:34.652	7318900.00	3	6
104	90000.00	in	sale:billiard	TAB-260614011344	Payment INV: TAB-260614011344 (QRIS)	QRIS	2026-06-15 04:12:52.913	7408900.00	3	6
105	47000.00	in	sale:billiard	TAB-260615101030	Payment INV: TAB-260615101030 (CASH)	CASH	2026-06-15 12:11:46.663	7455900.00	4	\N
106	49000.00	in	sale:billiard	TAB-260615101917	Payment INV: TAB-260615101917 (CASH)	CASH	2026-06-15 12:19:44.125	7504900.00	4	\N
107	20000.00	in	sale:billiard	TAB-260615113219	Payment INV: TAB-260615113219 (CASH)	CASH	2026-06-15 12:36:04.392	7524900.00	4	7
108	83000.00	in	sale:billiard	TAB-260615112350	Payment INV: TAB-260615112350 (CASH)	CASH	2026-06-15 14:28:26.435	7607900.00	4	7
109	55000.00	in	sale:billiard	TAB-260615122755	Payment INV: TAB-260615122755 (CASH)	CASH	2026-06-15 14:29:24.465	7662900.00	4	7
110	35000.00	in	sale:billiard	TAB-260615124351	Payment INV: TAB-260615124351 (CASH)	CASH	2026-06-15 14:52:28.3	7697900.00	4	7
111	12000.00	in	sale:cafe	CAFE-20260615-0002-648	Payment INV: CAFE-20260615-0002-648 (CASH)	CASH	2026-06-15 14:53:31.062	7709900.00	4	7
112	67000.00	in	sale:billiard	TAB-260615134915	Payment INV: TAB-260615134915 (CASH)	CASH	2026-06-15 16:49:56.892	7776900.00	4	7
113	62000.00	in	sale:billiard	TAB-260615145022	Payment INV: TAB-260615145022 (CASH)	CASH	2026-06-15 16:51:10.578	7838900.00	4	7
114	15000.00	in	sale:cafe	CAFE-20260615-0003-10	Payment INV: CAFE-20260615-0003-10 (CASH)	CASH	2026-06-15 16:53:27.663	7853900.00	4	7
115	85000.00	in	sale:billiard	TAB-260615131853	Payment INV: TAB-260615131853 (CASH)	CASH	2026-06-15 17:24:13.123	7938900.00	4	7
116	50000.00	in	sale:billiard	TAB-260615160453	Payment INV: TAB-260615160453 (CASH)	CASH	2026-06-15 18:36:44.059	7988900.00	4	7
117	50000.00	in	sale:billiard	TAB-260615193126	Payment INV: TAB-260615193126 (CASH)	CASH	2026-06-15 20:32:13.412	8038900.00	4	8
118	100000.00	in	sale:billiard	TAB-260615183614	Payment INV: TAB-260615183614 (CASH)	CASH	2026-06-15 20:37:40.464	8138900.00	4	8
119	71000.00	in	sale:billiard	TAB-260615190443	Payment INV: TAB-260615190443 (CASH)	CASH	2026-06-15 21:06:07.895	8209900.00	4	8
120	100000.00	in	sale:billiard	TAB-260615191235	Payment INV: TAB-260615191235 (CASH)	CASH	2026-06-15 21:14:24.52	8309900.00	4	8
121	100000.00	in	sale:billiard	TAB-260615193940	Payment INV: TAB-260615193940 (CASH)	CASH	2026-06-15 21:47:17.603	8409900.00	4	8
122	109600.00	in	sale:billiard	TAB-260615194609	Payment INV: TAB-260615194609 (CASH)	CASH	2026-06-15 22:20:46.071	8519500.00	4	8
123	91000.00	in	sale:billiard	TAB-260615202337	Payment INV: TAB-260615202337 (CASH)	CASH	2026-06-15 23:25:40.526	8610500.00	4	8
124	60000.00	in	sale:billiard	TAB-260615212813	Payment INV: TAB-260615212813 (CASH)	CASH	2026-06-15 23:29:55.639	8670500.00	4	8
125	125000.00	in	sale:billiard	TAB-260615205833	Payment INV: TAB-260615205833 (CASH)	CASH	2026-06-15 23:34:27.419	8795500.00	4	8
126	80000.00	in	sale:billiard	TAB-260615214053	Payment INV: TAB-260615214053 (CASH)	CASH	2026-06-15 23:42:13.481	8875500.00	4	8
127	77000.00	in	sale:billiard	TAB-260615204508	Payment INV: TAB-260615204508 (CASH)	CASH	2026-06-15 23:46:07.176	8952500.00	4	8
128	146900.00	in	sale:billiard	TAB-260615194405	Payment INV: TAB-260615194405 (QRIS)	QRIS	2026-06-16 00:11:39.701	9099400.00	4	8
129	124000.00	in	sale:billiard	TAB-260615215230	Payment INV: TAB-260615215230 (CASH)	CASH	2026-06-16 00:25:27.237	9223400.00	4	8
130	30000.00	in	sale:billiard	TAB-260615212400	Split Payment [Payer 1] INV: TAB-260615212400	CASH	2026-06-16 00:26:14.374	9253400.00	4	8
131	81000.00	in	sale:billiard	TAB-260615212400	Payment INV: TAB-260615212400 (QRIS)	QRIS	2026-06-16 00:26:46.5	9334400.00	4	8
132	50000.00	in	sale:billiard	TAB-260615233448	Payment INV: TAB-260615233448 (CASH)	CASH	2026-06-16 01:39:43.095	9384400.00	4	8
133	50000.00	in	sale:billiard	TAB-260615234901	Payment INV: TAB-260615234901 (CASH)	CASH	2026-06-16 01:52:47.637	9434400.00	4	8
134	54000.00	in	sale:billiard	TAB-260616101125	Payment INV: TAB-260616101125 (CASH)	CASH	2026-06-16 12:12:05.667	9488400.00	7	9
135	52000.00	in	sale:billiard	TAB-260616114353	Payment INV: TAB-260616114353 (CASH)	CASH	2026-06-16 13:47:59.067	9540400.00	7	9
136	121000.00	in	sale:billiard	TAB-260616110403	Payment INV: TAB-260616110403 (CASH)	CASH	2026-06-16 14:07:03.458	9661400.00	7	9
137	107000.00	in	sale:billiard	TAB-260616105508	Payment INV: TAB-260616105508 (CASH)	CASH	2026-06-16 15:09:13.566	9768400.00	7	9
138	97000.00	in	sale:billiard	TAB-260616113905	Payment INV: TAB-260616113905 (QRIS)	QRIS	2026-06-16 15:39:52.416	9865400.00	7	9
139	100000.00	in	sale:billiard	TAB-260616125934	Payment INV: TAB-260616125934 (CASH)	CASH	2026-06-16 16:00:59.591	9965400.00	7	9
140	102000.00	in	sale:billiard	TAB-260616154805	Payment INV: TAB-260616154805 (CASH)	CASH	2026-06-16 17:51:37.414	10067400.00	7	9
141	100000.00	in	sale:billiard	TAB-260616151329	Payment INV: TAB-260616151329 (CASH)	CASH	2026-06-16 18:19:10.13	10167400.00	7	9
142	112000.00	in	sale:billiard	TAB-260616152311	Payment INV: TAB-260616152311 (QRIS)	QRIS	2026-06-16 18:27:04.178	10279400.00	7	9
143	50000.00	in	sale:billiard	TAB-260616192131	Payment INV: TAB-260616192131 (CASH)	CASH	2026-06-16 20:23:14.793	10329400.00	7	10
144	72000.00	in	sale:billiard	TAB-260616185320	Payment INV: TAB-260616185320 (CASH)	CASH	2026-06-16 20:56:55.959	10401400.00	7	10
145	60000.00	in	sale:billiard	TAB-260616192238	Payment INV: TAB-260616192238 (CASH)	CASH	2026-06-16 21:19:16.198	10461400.00	7	10
146	100000.00	in	sale:billiard	TAB-260616193327	Payment INV: TAB-260616193327 (CASH)	CASH	2026-06-16 21:35:43.784	10561400.00	7	10
147	20000.00	in	sale:cafe	CAFE-20260616-0002-901	Payment INV: CAFE-20260616-0002-901 (CASH)	CASH	2026-06-16 21:55:42.755	10581400.00	7	10
148	30000.00	in	sale:cafe	CAFE-20260616-0001-274	Payment INV: CAFE-20260616-0001-274 (QRIS)	QRIS	2026-06-16 22:06:14.008	10611400.00	7	10
149	100000.00	in	sale:billiard	TAB-260616185607	Payment INV: TAB-260616185607 (CASH)	CASH	2026-06-16 22:10:36.986	10711400.00	7	10
150	30000.00	in	sale:billiard	TAB-260616210553	Payment INV: TAB-260616210553 (CASH)	CASH	2026-06-16 22:11:01.032	10741400.00	7	10
151	60000.00	in	sale:billiard	TAB-260616202857	Payment INV: TAB-260616202857 (QRIS)	QRIS	2026-06-16 22:29:17.884	10801400.00	7	10
152	116000.00	in	sale:billiard	TAB-260616203330	Payment INV: TAB-260616203330 (CASH)	CASH	2026-06-16 22:35:58.774	10917400.00	7	10
153	30000.00	in	sale:billiard	TAB-260616220415	Payment INV: TAB-260616220415 (CASH)	CASH	2026-06-16 23:02:02.238	10947400.00	7	10
154	130000.00	in	sale:billiard	TAB-260616193519	Payment INV: TAB-260616193519 (CASH)	CASH	2026-06-16 23:54:37.813	11077400.00	7	10
155	60000.00	in	sale:billiard	TAB-260616222340	Payment INV: TAB-260616222340 (CASH)	CASH	2026-06-17 00:27:55.014	11137400.00	7	10
156	160000.00	in	sale:billiard	TAB-260616211408	Payment INV: TAB-260616211408 (CASH)	CASH	2026-06-17 00:31:03.303	11297400.00	7	10
157	100000.00	in	sale:billiard	TAB-260616233509	Payment INV: TAB-260616233509 (CASH)	CASH	2026-06-17 01:36:58.802	11397400.00	7	10
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
62	MIX PLATER (DELETED-1781323864442)	Gram	10.000	5.000	IG-001-DEL-1781323864442	Packaging	15000.00	\N	\N			100.00	15000.00	1.000	Gram	f	KITCHEN	f	SHIFT	f	\N	\N	\N	\N	2026-06-13 10:52:54.207122	2026-06-13 11:11:04.452948	2026-06-13 11:11:04.452948
66	SPRITE	Ml	10140.000	1000.000	IG-004	Packaging	0.00	\N	\N			100.00	\N	\N	\N	f	BAR	f	SHIFT	f	\N	\N	\N	\N	2026-06-13 11:31:50.772654	2026-06-13 11:31:50.772654	\N
67	FRESH TEA (DELETED-1781325303608)	Ml	11000.000	1000.000	IG-005-DEL-1781325303608	Packaging	0.00	\N	\N			100.00	\N	\N	\N	f	BAR	f	SHIFT	f	\N	\N	\N	\N	2026-06-13 11:32:45.188126	2026-06-13 11:35:03.623718	2026-06-13 11:35:03.623718
70	FRESH TEA	Ml	15400.000	1000.000	IG-007	Packaging	0.00	\N	\N			100.00	\N	\N	\N	f	BAR	f	SHIFT	f	\N	\N	\N	\N	2026-06-13 11:42:12.316042	2026-06-13 11:42:12.316042	\N
73	POWER ADE (DELETED-1781326180998)	Ml	7200.000	1000.000	IG-010-DEL-1781326180998	Packaging	0.00	\N	\N			100.00	\N	\N	\N	f	CASHIER	f	SHIFT	f	\N	\N	\N	\N	2026-06-13 11:46:35.253651	2026-06-13 11:49:41.010085	2026-06-13 11:49:41.010085
75	LECI BEAR (DELETED-1781326185444)	Ml	3200.000	1000.000	IG-012-DEL-1781326185444	Packaging	0.00	\N	\N			100.00	\N	\N	\N	f	CASHIER	f	SHIFT	f	\N	\N	\N	\N	2026-06-13 11:49:31.213287	2026-06-13 11:49:45.452453	2026-06-13 11:49:45.452453
76	LECI BEAR	Gram	3200.000	1000.000	IG-012	Packaging	0.00	\N	\N			100.00	\N	\N	\N	f	BAR	f	SHIFT	f	\N	\N	\N	\N	2026-06-13 11:50:16.88209	2026-06-13 11:50:16.88209	\N
78	POWER ADE	Ml	7200.000	1000.000	IG-014	Packaging	0.00	\N	\N			100.00	\N	\N	\N	f	BAR	f	SHIFT	f	\N	\N	\N	\N	2026-06-13 11:51:53.251104	2026-06-13 11:51:53.251104	\N
65	MINERAL (DELETED-1781326466515)	Ml	756000.000	100000.000	IG-003-DEL-1781326466515	Packaging	0.00	\N	\N			100.00	\N	\N	\N	f	KITCHEN	f	SHIFT	f	\N	\N	\N	\N	2026-06-13 11:30:32.464385	2026-06-13 11:54:26.52465	2026-06-13 11:54:26.52465
69	FANTA (DELETED-1781326471158)	Ml	10920.000	1000.000	IG-006-DEL-1781326471158	Packaging	0.00	\N	\N			100.00	\N	\N	\N	f	CASHIER	f	SHIFT	f	\N	\N	\N	\N	2026-06-13 11:40:57.92685	2026-06-13 11:54:31.167923	2026-06-13 11:54:31.167923
82	FANTA	Ml	10920.000	1000.000	IG-017	Packaging	0.00	\N	\N			100.00	\N	\N	\N	f	BAR	f	SHIFT	f	\N	\N	\N	\N	2026-06-13 11:54:52.506907	2026-06-13 11:54:52.506907	\N
84	ULTRA MILK	Ml	16000.000	500.000	IG-019	Packaging	0.00	\N	\N			100.00	\N	\N	\N	f	BAR	f	SHIFT	f	\N	\N	\N	\N	2026-06-13 11:58:53.230478	2026-06-13 11:58:53.230478	\N
85	SARSAPILA BEAR	Ml	3840.000	1000.000	IG-020	Packaging	0.00	\N	\N			100.00	\N	\N	\N	f	BAR	f	SHIFT	f	\N	\N	\N	\N	2026-06-13 12:00:05.431807	2026-06-13 12:00:05.431807	\N
79	WATER LEMON SPRITE	Ml	11475.000	1000.000	IG-015	Packaging	0.00	\N	\N			100.00	\N	\N	\N	f	BAR	f	SHIFT	f	\N	\N	\N	\N	2026-06-13 11:53:10.651996	2026-06-17 02:41:24.912847	\N
63	GULA (DELETED-1781327492829)	Gram	1000.000	50.000	IG-001-DEL-1781327492829	Packaging	18.00	\N	\N			100.00	18000.00	1000.000	Gram	f	BAR	f	SHIFT	f	\N	\N	\N	\N	2026-06-13 11:24:41.744917	2026-06-13 12:11:32.838119	2026-06-13 12:11:32.838119
89	TEBS	Ml	330.000	500.000	IG-024	Packaging	0.00	\N	\N			100.00	\N	\N	\N	f	BAR	f	SHIFT	f	\N	\N	\N	\N	2026-06-13 12:19:37.939552	2026-06-13 12:19:37.939552	\N
86	GULA (DELETED-1781338013075)	Gram	3000.000	1000.000	IG-021-DEL-1781338013075	Packaging	18.00	\N	\N			100.00	18000.00	1000.000	Gram	f	BAR	f	SHIFT	f	\N	\N	\N	\N	2026-06-13 12:12:08.038468	2026-06-13 15:06:53.081575	2026-06-13 15:06:53.081575
90	GREEN SAND	Ml	1000.000	500.000	IG-025	Packaging	0.00	\N	\N			100.00	\N	\N	\N	f	BAR	f	SHIFT	f	\N	\N	\N	\N	2026-06-13 12:20:49.083094	2026-06-14 21:02:36.059159	\N
68	COCA COLA	Ml	6630.000	1000.000	IG-005	Packaging	0.00	\N	\N			100.00	\N	\N	\N	f	BAR	f	SHIFT	f	\N	\N	\N	\N	2026-06-13 11:40:00.894433	2026-06-14 12:14:08.932829	\N
87	CINCAU CAP PANDA	Ml	1240.000	500.000	IG-022	Packaging	0.00	\N	\N			100.00	\N	\N	\N	f	BAR	f	SHIFT	f	\N	\N	\N	\N	2026-06-13 12:14:19.92386	2026-06-14 23:38:21.103866	\N
71	NUTRI BOST (DELETED-1781606306162)	Ml	300.000	500.000	IG-008-DEL-1781606306162	Packaging	0.00	\N	\N			100.00	\N	\N	\N	f	BAR	f	SHIFT	f	\N	\N	\N	\N	2026-06-13 11:43:35.711328	2026-06-16 17:38:26.173512	2026-06-16 17:38:26.173512
77	TEMULAWAK BEAR	Ml	0.000	1000.000	IG-013	Packaging	0.00	\N	\N			100.00	\N	\N	\N	f	BAR	f	SHIFT	f	\N	\N	\N	\N	2026-06-13 11:51:10.189608	2026-06-15 21:59:21.81085	\N
74	COFFE BEAR	Ml	6080.000	1000.000	IG-011	Packaging	0.00	\N	\N			100.00	\N	\N	\N	f	BAR	f	SHIFT	f	\N	\N	\N	\N	2026-06-13 11:47:25.441544	2026-06-15 19:59:01.059868	\N
72	YOU C 1000	Ml	8004.000	1000.000	IG-009	Packaging	0.00	\N	\N			100.00	\N	\N	\N	f	BAR	f	SHIFT	f	\N	\N	\N	\N	2026-06-13 11:44:27.413354	2026-06-16 12:33:18.800385	\N
81	AIR MINERAL	Ml	724199.000	10000.000	IG-016	Packaging	0.00	\N	\N			100.00	\N	\N	\N	f	BAR	f	SHIFT	f	\N	\N	\N	\N	2026-06-13 11:54:15.782531	2026-06-16 23:38:05.403822	\N
91	KENTANG (DELETED-1781330670523)	Gram	1000.000	100.000	IG-026-DEL-1781330670523	Packaging	0.00	\N	\N			100.00	\N	\N	\N	f	CASHIER	f	SHIFT	f	\N	\N	\N	\N	2026-06-13 13:04:23.449311	2026-06-13 13:04:30.531579	2026-06-13 13:04:30.531579
92	KENTANG (DELETED-1781335215219)	Gram	1000.000	150.000	IG-026-DEL-1781335215219	Packaging	0.00	\N	\N			100.00	\N	\N	\N	f	KITCHEN	f	SHIFT	f	\N	\N	\N	\N	2026-06-13 13:05:39.894059	2026-06-13 14:20:15.227611	2026-06-13 14:20:15.227611
93	MIX PLATER (DELETED-1781330834198)	Gram	1000.000	100.000	IG-027-DEL-1781330834198	Raw Material	0.00	\N	\N			100.00	\N	\N	\N	f	CASHIER	f	SHIFT	f	\N	\N	\N	\N	2026-06-13 13:06:09.147399	2026-06-13 13:07:14.210893	2026-06-13 13:07:14.210893
94	NUGGET (DELETED-1781330836546)	Gram	1000.000	100.000	IG-028-DEL-1781330836546	Packaging	0.00	\N	\N			100.00	\N	\N	\N	f	CASHIER	f	SHIFT	f	\N	\N	\N	\N	2026-06-13 13:07:01.362175	2026-06-13 13:07:16.558566	2026-06-13 13:07:16.558566
96	MIX PLATER (DELETED-1781335221653)	Gram	1000.000	100.000	IG-028-DEL-1781335221653	Packaging	0.00	\N	\N			100.00	\N	\N	\N	f	KITCHEN	f	SHIFT	f	\N	\N	\N	\N	2026-06-13 13:07:52.613943	2026-06-13 14:20:21.663388	2026-06-13 14:20:21.663388
95	NUGGET (DELETED-1781335211807)	Gram	1000.000	100.000	IG-027-DEL-1781335211807	Packaging	0.00	\N	\N			100.00	\N	\N	\N	f	KITCHEN	f	SHIFT	f	\N	\N	\N	\N	2026-06-13 13:07:32.849592	2026-06-13 14:20:11.82167	2026-06-13 14:20:11.82167
97	SOSIS MERAH (DELETED-1781335231078)	Gram	1000.000	100.000	IG-029-DEL-1781335231078	Packaging	0.00	\N	\N			100.00	\N	\N	\N	f	KITCHEN	f	SHIFT	f	\N	\N	\N	\N	2026-06-13 13:08:13.910089	2026-06-13 14:20:31.086195	2026-06-13 14:20:31.086195
88	BINTANG ZERO (DELETED-1781335585071)	Ml	5280.000	500.000	IG-023-DEL-1781335585071	Packaging	0.00	\N	\N			100.00	\N	\N	\N	f	BAR	f	SHIFT	f	\N	\N	\N	\N	2026-06-13 12:15:24.968285	2026-06-13 14:26:25.080237	2026-06-13 14:26:25.080237
98	KOPI GULA AREN (DELETED-1781335987867)	Ml	399.000	20.000	IG-030-DEL-1781335987867	Packaging	0.00	\N	\N			100.00	\N	\N	\N	f	CASHIER	f	SHIFT	f	\N	\N	\N	\N	2026-06-13 13:59:01.79075	2026-06-13 14:33:07.881897	2026-06-13 14:33:07.881897
101	MIX PLATER (DELETED-1781336110816)	Pcs	30.000	3.000	IG-033-DEL-1781336110816	Packaging	0.00	\N	\N			100.00	\N	\N	\N	f	CASHIER	f	SHIFT	f	\N	\N	\N	\N	2026-06-13 14:35:02.496836	2026-06-13 14:35:10.82503	2026-06-13 14:35:10.82503
107	RICE BOWL BULGOGI	Pcs	13.000	1.000	IG-038	Packaging	0.00	\N	\N			100.00	\N	\N	\N	f	KITCHEN	f	SHIFT	f	\N	\N	\N	\N	2026-06-13 14:46:56.918365	2026-06-13 14:46:56.918365	\N
108	CHIKEN BURGER	Pcs	8.000	1.000	IG-039	Packaging	0.00	\N	\N			100.00	\N	\N	\N	f	KITCHEN	f	SHIFT	f	\N	\N	\N	\N	2026-06-13 14:47:21.907963	2026-06-13 14:47:21.907963	\N
109	RICE BOWL TERIYAKI	Pcs	3.000	1.000	IG-040	Packaging	0.00	\N	\N			100.00	\N	\N	\N	f	KITCHEN	f	SHIFT	f	\N	\N	\N	\N	2026-06-13 14:47:54.560784	2026-06-13 14:47:54.560784	\N
110	RICE BOWL THAILAND	Pcs	8.000	1.000	IG-041	Packaging	0.00	\N	\N			100.00	\N	\N	\N	f	KITCHEN	f	SHIFT	f	\N	\N	\N	\N	2026-06-13 14:48:46.477025	2026-06-13 14:48:46.477025	\N
113	NASI GORENG SPECIAL	Pcs	2000.000	10.000	IG-044	Raw Material	0.00	\N	\N			100.00	\N	\N	\N	f	KITCHEN	f	SHIFT	f	\N	\N	\N	\N	2026-06-13 14:51:45.598977	2026-06-13 14:51:45.598977	\N
119	MATCHA  (DELETED-1781337509945)	Gram	1380.000	300.000	IG-050-DEL-1781337509945	Raw Material	0.00	\N	\N			100.00	\N	\N	\N	f	CASHIER	f	SHIFT	f	\N	\N	\N	\N	2026-06-13 14:58:24.457329	2026-06-13 14:58:30.071967	2026-06-13 14:58:30.071967
120	MATCHA  (DELETED-1781337541770)	Gram	1380.000	300.000	IG-050-DEL-1781337541770	Packaging	0.00	\N	\N			100.00	\N	\N	\N	f	KITCHEN	f	SHIFT	f	\N	\N	\N	\N	2026-06-13 14:58:54.502959	2026-06-13 14:59:01.77897	2026-06-13 14:59:01.77897
122	THAI TEA	Gram	1530.000	300.000	IG-051	Packaging	0.00	\N	\N			100.00	\N	\N	\N	f	BAR	f	SHIFT	f	\N	\N	\N	\N	2026-06-13 14:59:47.383943	2026-06-13 14:59:47.383943	\N
126	SALTED CARAMEL LATTE	Gram	1440.000	300.000	IG-055	Packaging	0.00	\N	\N			100.00	\N	\N	\N	f	CASHIER	f	SHIFT	f	\N	\N	\N	\N	2026-06-13 15:02:44.651459	2026-06-13 15:02:44.651459	\N
129	AMERICANO ICE (DELETED-1781337874900)	Gram	1470.000	300.000	IG-058-DEL-1781337874900	Packaging	0.00	\N	\N			100.00	\N	\N	\N	f	CASHIER	f	SHIFT	f	\N	\N	\N	\N	2026-06-13 15:04:29.59617	2026-06-13 15:04:34.909997	2026-06-13 15:04:34.909997
64	TEH (DELETED-1781338007830)	Gram	400.000	10.000	IG-002-DEL-1781338007830	Packaging	90.00	\N	\N			100.00	36000.00	400.000	Gram	f	BAR	f	SHIFT	f	\N	\N	\N	\N	2026-06-13 11:26:14.981024	2026-06-13 15:06:47.83797	2026-06-13 15:06:47.83797
99	BINTANG ZERO	Ml	4620.000	330.000	IG-031	Packaging	0.00	\N	\N			100.00	\N	\N	\N	f	BAR	f	SHIFT	f	\N	\N	\N	\N	2026-06-13 14:26:59.646256	2026-06-15 20:14:31.996417	\N
103	KENTANG GORENG	Gram	750.000	300.000	IG-034	Packaging	0.00	\N	\N			100.00	\N	\N	\N	f	KITCHEN	f	SHIFT	f	\N	\N	\N	\N	2026-06-13 14:37:49.009757	2026-06-15 19:59:39.978532	\N
111	RUJAK CIRENG	Pcs	115.000	10.000	IG-042	Packaging	0.00	\N	\N			100.00	\N	\N	\N	f	CASHIER	f	SHIFT	f	\N	\N	\N	\N	2026-06-13 14:50:09.803252	2026-06-16 13:00:02.636029	\N
116	RICH CHOCO	Gram	1621.000	300.000	IG-047	Packaging	0.00	\N	\N			100.00	\N	\N	\N	f	BAR	f	SHIFT	f	\N	\N	\N	\N	2026-06-13 14:55:52.664339	2026-06-14 23:27:17.288244	\N
139	LYCHEE TEA	Gram	4760.000	100.000	IG-067	Packaging	0.00	\N	\N			100.00	\N	\N	\N	f	BAR	f	SHIFT	f	\N	\N	\N	\N	2026-06-13 18:40:39.602882	2026-06-17 00:26:38.19939	\N
146	INDOMIE GORENG DOUBLE	Pcs	100.000	10.000	IG-071	Packaging	0.00	\N	\N			100.00	\N	\N	\N	f	KITCHEN	f	SHIFT	f	\N	\N	\N	\N	2026-06-14 10:12:20.360649	2026-06-14 10:12:20.360649	\N
117	STRAWBERRY BUBLEGUM	Gram	210.000	150.000	IG-048	Packaging	0.00	\N	\N			100.00	\N	\N	\N	f	BAR	f	SHIFT	f	\N	\N	\N	\N	2026-06-13 14:56:40.752773	2026-06-13 22:11:45.349662	\N
118	BUBLE GUM/PERMEN KARET	Gram	60.000	30.000	IG-049	Packaging	0.00	\N	\N			100.00	\N	\N	\N	f	BAR	f	SHIFT	f	\N	\N	\N	\N	2026-06-13 14:57:45.180783	2026-06-14 18:57:15.519765	\N
106	BEEF BURGER	Pcs	6.000	1.000	IG-037	Packaging	0.00	\N	\N			100.00	\N	\N	\N	f	KITCHEN	f	SHIFT	f	\N	\N	\N	\N	2026-06-13 14:41:00.126699	2026-06-13 21:39:25.352167	\N
112	NASI GORENG JAWA	Pcs	1999.000	10.000	IG-043	Packaging	0.00	\N	\N			100.00	\N	\N	\N	f	KITCHEN	f	SHIFT	f	\N	\N	\N	\N	2026-06-13 14:51:13.29786	2026-06-16 20:02:29.966305	\N
83	CIMORY SUSU (DELETED-1781605745573)	Ml	2250.000	500.000	IG-018-DEL-1781605745573	Packaging	0.00	\N	\N			100.00	\N	\N	\N	f	BAR	f	SHIFT	f	\N	\N	\N	\N	2026-06-13 11:57:37.001347	2026-06-16 17:29:05.589363	2026-06-16 17:29:05.589363
147	PISANG GORENG	Pcs	100.000	10.000	IG-072	Packaging	0.00	\N	\N			100.00	\N	\N	\N	f	CASHIER	f	SHIFT	f	\N	\N	\N	\N	2026-06-14 10:12:50.16013	2026-06-14 10:12:50.16013	\N
138	TAMBAH ES BATU	Pcs	999.000	10.000	IG-066	Packaging	0.00	\N	\N			100.00	\N	\N	\N	f	BAR	f	SHIFT	f	\N	\N	\N	\N	2026-06-13 15:09:44.787811	2026-06-15 12:24:20.930066	\N
140	LEMON TEA	Gram	4700.000	100.000	IG-068	Packaging	0.00	\N	\N			100.00	\N	\N	\N	f	BAR	f	SHIFT	f	\N	\N	\N	\N	2026-06-13 18:41:23.88339	2026-06-16 23:35:40.062447	\N
115	RED VELVET	Gram	1770.000	300.000	IG-046	Packaging	0.00	\N	\N			100.00	\N	\N	\N	f	BAR	f	SHIFT	f	\N	\N	\N	\N	2026-06-13 14:55:16.017594	2026-06-16 12:59:53.464903	\N
121	MATCHA	Gram	1320.000	300.000	IG-050	Packaging	0.00	\N	\N			100.00	\N	\N	\N	f	BAR	f	SHIFT	f	\N	\N	\N	\N	2026-06-13 14:59:16.967144	2026-06-15 22:57:04.014421	\N
132	MILO	Gram	5250.000	300.000	IG-060	Packaging	0.00	\N	\N			100.00	\N	\N	\N	f	BAR	f	SHIFT	f	\N	\N	\N	\N	2026-06-13 15:06:20.260401	2026-06-16 19:33:50.041251	\N
135	HOT TEA	Pcs	998.000	10.000	IG-063	Packaging	0.00	\N	\N			100.00	\N	\N	\N	f	BAR	f	SHIFT	f	\N	\N	\N	\N	2026-06-13 15:08:16.068415	2026-06-14 22:05:06.989676	\N
104	CILOK	Pcs	146.000	10.000	IG-035	Packaging	0.00	\N	\N			100.00	\N	\N	\N	f	KITCHEN	f	SHIFT	f	\N	\N	\N	\N	2026-06-13 14:39:11.489441	2026-06-13 23:21:50.244348	\N
151	HAND GLOVE	Pcs	59.000	1.000	IG-074	Packaging	20000.00	\N	\N			100.00	20000.00	1.000	Gram	f	CASHIER	f	SHIFT	f			0.00	0.00	2026-06-15 12:33:26.331017	2026-06-16 20:34:08.304435	\N
141	TEMPE KEMUL	Pcs	998.000	100.000	IG-069	Semi-Finished	0.00	\N	\N			100.00	\N	\N	\N	f	KITCHEN	f	SHIFT	f	\N	\N	\N	\N	2026-06-13 19:33:29.087916	2026-06-14 19:26:40.599228	\N
137	KOPI SUSU	Pcs	993.000	10.000	IG-065	Packaging	0.00	\N	\N			100.00	\N	\N	\N	f	BAR	f	SHIFT	f	\N	\N	\N	\N	2026-06-13 15:09:08.116094	2026-06-15 21:59:44.662993	\N
127	PANDAN COFFE	Gram	1380.000	300.000	IG-056	Packaging	0.00	\N	\N			100.00	\N	\N	\N	f	BAR	f	SHIFT	f	\N	\N	\N	\N	2026-06-13 15:03:21.176016	2026-06-16 21:14:35.449219	\N
136	KOPI HITAM	Pcs	993.000	10.000	IG-064	Packaging	0.00	\N	\N			100.00	\N	\N	\N	f	BAR	f	SHIFT	f	\N	\N	\N	\N	2026-06-13 15:08:41.968675	2026-06-16 19:09:28.624634	\N
131	HOT AMERICANO	Gram	540.000	300.000	IG-059	Packaging	0.00	\N	\N			100.00	\N	\N	\N	f	BAR	f	SHIFT	f	\N	\N	\N	\N	2026-06-13 15:05:27.479439	2026-06-15 19:36:29.284883	\N
123	TARO	Gram	1440.000	300.000	IG-052	Packaging	0.00	\N	\N			100.00	\N	\N	\N	f	BAR	f	SHIFT	f	\N	\N	\N	\N	2026-06-13 15:00:11.021862	2026-06-16 21:14:35.512835	\N
102	MIX PLATER	Pcs	18.000	3.000	IG-033	Packaging	0.00	\N	\N			100.00	\N	\N	\N	f	KITCHEN	f	SHIFT	f	\N	\N	\N	\N	2026-06-13 14:35:32.748559	2026-06-16 11:39:43.093161	\N
100	NUGET	Pcs	56.000	16.000	IG-032	Packaging	0.00	\N	\N			100.00	\N	\N	\N	f	KITCHEN	f	SHIFT	f	\N	\N	\N	\N	2026-06-13 14:32:30.046566	2026-06-14 23:37:36.488102	\N
145	INDOMIE GORENG	Pcs	99.000	10.000	IG-070	Packaging	0.00	\N	\N			100.00	\N	\N	\N	f	KITCHEN	f	SHIFT	f	\N	\N	\N	\N	2026-06-14 10:11:49.761461	2026-06-15 12:39:53.531876	\N
114	TAMBAH TELUR	Pcs	999.000	10.000	IG-045	Packaging	0.00	\N	\N			100.00	\N	\N	\N	f	KITCHEN	f	SHIFT	f	\N	\N	\N	\N	2026-06-13 14:52:23.201269	2026-06-15 12:40:05.691755	\N
130	AMERICANO ICE	Gram	1410.000	300.000	IG-058	Packaging	0.00	\N	\N			100.00	\N	\N	\N	f	BAR	f	SHIFT	f	\N	\N	\N	\N	2026-06-13 15:04:59.091249	2026-06-15 14:50:35.627999	\N
124	COOCKIES & CREAM	Gram	750.000	300.000	IG-053	Packaging	0.00	\N	\N			100.00	\N	\N	\N	f	BAR	f	SHIFT	f	\N	\N	\N	\N	2026-06-13 15:00:49.334687	2026-06-16 21:15:41.60719	\N
148	ICE TEA (FREE)	Pcs	982.000	1.000	IG-073	Packaging	0.00	\N	\N			100.00	\N	\N	\N	f	CASHIER	f	SHIFT	f	\N	\N	\N	\N	2026-06-14 14:06:06.270466	2026-06-16 18:58:51.289275	\N
128	KOPI GULA AREN	Gram	1140.000	300.000	IG-057	Packaging	0.00	\N	\N			100.00	\N	\N	\N	f	BAR	f	SHIFT	f	\N	\N	\N	\N	2026-06-13 15:03:57.422733	2026-06-15 21:30:14.978096	\N
134	BLUE LAKEN	Pcs	998.000	10.000	IG-062	Packaging	0.00	\N	\N			100.00	\N	\N	\N	f	BAR	f	SHIFT	f	\N	\N	\N	\N	2026-06-13 15:07:51.385354	2026-06-15 21:38:43.338918	\N
105	SOSIS MERAH	Pcs	32.000	8.000	IG-036	Packaging	0.00	\N	\N			100.00	\N	\N	\N	f	CASHIER	f	SHIFT	f	\N	\N	\N	\N	2026-06-13 14:40:06.528965	2026-06-16 16:48:32.688867	\N
153	NUTRIBOOST	Pcs	61.000	10.000	IG-076	Packaging	0.00	\N	\N			100.00	\N	\N	\N	f	CASHIER	f	SHIFT	f	\N	\N	\N	\N	2026-06-16 17:38:47.996921	2026-06-16 17:38:47.996921	\N
152	CIMORY SUSU	Pcs	6.000	2.000	IG-075	Packaging	0.00	\N	\N			100.00	\N	\N	\N	f	BAR	f	SHIFT	f	\N	\N	\N	\N	2026-06-16 17:29:50.21211	2026-06-16 17:42:52.448938	\N
133	ICE TEA	Pcs	970.000	10.000	IG-061	Packaging	0.00	\N	\N			100.00	\N	\N	\N	f	BAR	f	SHIFT	f	\N	\N	\N	\N	2026-06-13 15:07:21.826521	2026-06-16 21:31:19.71092	\N
125	CAPUCINNO	Gram	1500.000	300.000	IG-054	Packaging	0.00	\N	\N			100.00	\N	\N	\N	f	BAR	f	SHIFT	f	\N	\N	\N	\N	2026-06-13 15:01:21.941307	2026-06-16 20:02:43.133581	\N
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
51	TAMBAH TELUR	3		\N	MNU-1781337194614			4000.00	t	0.00	0.000	0.000	f	100.00	f	KITCHEN	f	SHIFT	2026-06-13 14:53:14.613546	2026-06-13 14:53:23.103197	\N
50	NASI GORENG SPECIAL	3		\N	MNU-1781337179826			18000.00	t	0.00	0.000	0.000	f	100.00	f	KITCHEN	f	SHIFT	2026-06-13 14:52:59.825889	2026-06-13 14:53:29.253723	\N
49	NASI GORENG JAWA	3		\N	MNU-1781337162611			15000.00	t	0.00	0.000	0.000	f	100.00	f	KITCHEN	f	SHIFT	2026-06-13 14:52:42.610928	2026-06-13 14:53:36.435365	\N
33	CINCAU CAP PANDA	6		\N	MNU-1781329514472			12000.00	t	0.00	0.000	0.000	f	100.00	f	BAR	f	SHIFT	2026-06-13 12:45:14.462702	2026-06-13 14:24:50.3706	\N
36	GREEN SAND	6		\N	MNU-1781330165575			10000.00	t	0.00	0.000	0.000	f	100.00	f	BAR	f	SHIFT	2026-06-13 12:56:05.571482	2026-06-13 14:25:13.698946	\N
29	TEMULAWAK BEAR	6		\N	MNU-1781328514278			15000.00	t	0.00	0.000	0.000	f	100.00	f	BAR	f	SHIFT	2026-06-13 12:28:34.277549	2026-06-13 14:25:36.163883	\N
27	LECI BEAR	6		\N	MNU-1781328476230			15000.00	t	0.00	0.000	0.000	f	100.00	f	BAR	f	SHIFT	2026-06-13 12:27:56.228214	2026-06-13 14:25:52.039749	\N
28	SARSAPILA BEAR	6		\N	MNU-1781328492674			15000.00	t	0.00	0.000	0.000	f	100.00	f	BAR	f	SHIFT	2026-06-13 12:28:12.674019	2026-06-13 14:26:00.677819	\N
14	ICE TEA	4		\N	MNU-1781327083159			7000.00	t	0.00	0.000	0.000	f	100.00	f	BAR	f	SHIFT	2026-06-13 12:04:43.159536	2026-06-13 15:13:06.852835	\N
39	KOPI GULA AREN	4		\N	MNU-1781333968089			15000.00	t	0.00	0.000	0.000	f	100.00	f	BAR	f	SHIFT	2026-06-13 13:59:28.088709	2026-06-13 15:13:24.270096	\N
38	NUGGET	3		\N	MNU-1781330943240			12000.00	t	0.00	0.000	0.000	f	100.00	f	KITCHEN	f	SHIFT	2026-06-13 13:09:03.239861	2026-06-13 14:32:39.240654	\N
41	MIX PLATER	3		\N	MNU-1781336159275			15000.00	t	0.00	0.000	0.000	f	100.00	f	KITCHEN	f	SHIFT	2026-06-13 14:35:59.275406	2026-06-13 14:36:11.11276	\N
13	AIR MINERAL (DELETED-1781334814615)	6		\N	MNU-1781326943649-DEL-1781334814615			6000.00	f	0.00	756000.000	10000.000	f	100.00	f	BAR	f	SHIFT	2026-06-13 12:02:23.648637	2026-06-13 14:13:34.624391	2026-06-13 14:13:34.624391
40	AIR MINERAL	6		\N	MNU-1781334845896			6000.00	t	0.00	0.000	0.000	f	100.00	f	BAR	f	SHIFT	2026-06-13 14:14:05.895938	2026-06-13 14:14:53.216449	\N
59	HOT AMERICANO	4		\N	MNU-1781338574275			15000.00	t	0.00	0.000	0.000	f	100.00	f	BAR	f	SHIFT	2026-06-13 15:16:14.275416	2026-06-13 15:16:22.853364	\N
26	COFFE BEAR	6		\N	MNU-1781328453621			15000.00	t	0.00	0.000	0.000	f	100.00	f	BAR	f	SHIFT	2026-06-13 12:27:33.621329	2026-06-13 14:15:58.661344	\N
25	POWER ADE	6		\N	MNU-1781328389015			8000.00	t	0.00	0.000	0.000	f	100.00	f	BAR	f	SHIFT	2026-06-13 12:26:29.015217	2026-06-13 14:16:19.574995	\N
24	YOU C 1000	6		\N	MNU-1781328340475			12000.00	t	0.00	0.000	0.000	f	100.00	f	BAR	f	SHIFT	2026-06-13 12:25:40.474451	2026-06-13 14:16:34.840984	\N
52	TAMBAH ICE BATU	4		\N	MNU-1781338212190			1000.00	t	0.00	0.000	0.000	f	100.00	f	BAR	f	SHIFT	2026-06-13 15:10:12.190637	2026-06-13 15:14:12.842126	\N
35	TEBS	6		\N	MNU-1781330084528			10000.00	t	0.00	0.000	0.000	f	100.00	f	BAR	f	SHIFT	2026-06-13 12:54:44.527687	2026-06-13 14:21:03.733037	\N
23	NUTRI BOST	6		\N	MNU-1781328299469			10000.00	t	0.00	0.000	0.000	f	100.00	f	BAR	f	SHIFT	2026-06-13 12:24:59.468826	2026-06-16 17:39:04.012912	\N
31	WATER LEMON SPRITE	6		\N	MNU-1781328747530			11000.00	t	0.00	0.000	0.000	f	100.00	f	BAR	f	SHIFT	2026-06-13 12:32:27.529963	2026-06-16 17:41:02.51626	\N
22	SPRITE	6		\N	MNU-1781328254046			8000.00	t	0.00	0.000	0.000	f	100.00	f	BAR	f	SHIFT	2026-06-13 12:24:14.045837	2026-06-13 14:22:40.063508	\N
21	COCA COLA	6		\N	MNU-1781328225100			8000.00	t	0.00	0.000	0.000	f	100.00	f	BAR	f	SHIFT	2026-06-13 12:23:45.100636	2026-06-13 14:22:54.026256	\N
20	FANTA	6		\N	MNU-1781328184456			8000.00	t	0.00	0.000	0.000	f	100.00	f	BAR	f	SHIFT	2026-06-13 12:23:04.456123	2026-06-13 14:23:04.941434	\N
19	FRESH TEA	6		\N	MNU-1781328135864			7000.00	t	0.00	0.000	0.000	f	100.00	f	BAR	f	SHIFT	2026-06-13 12:22:15.863792	2026-06-13 14:23:25.185217	\N
42	KENTANG GORENG	3		\N	MNU-1781336292050			12000.00	t	0.00	0.000	0.000	f	100.00	f	KITCHEN	f	SHIFT	2026-06-13 14:38:12.049866	2026-06-13 14:38:31.717546	\N
37	SOSIS MERAH	3		\N	MNU-1781330918070			12000.00	t	0.00	0.000	0.000	f	100.00	f	KITCHEN	f	SHIFT	2026-06-13 13:08:38.069896	2026-06-13 14:41:33.743148	\N
15	BINTANG ZERO	6		\N	MNU-1781327769578			12000.00	t	0.00	5280.000	500.000	f	100.00	f	BAR	f	SHIFT	2026-06-13 12:16:09.577745	2026-06-13 14:42:29.156457	\N
43	BEEF BURGER	3		\N	MNU-1781336635038			15000.00	t	0.00	0.000	0.000	f	100.00	f	KITCHEN	f	SHIFT	2026-06-13 14:43:55.038052	2026-06-13 14:44:04.159101	\N
48	RICE BOWL TERIYAKI	3		\N	MNU-1781336782966			15000.00	t	0.00	0.000	0.000	f	100.00	f	KITCHEN	f	SHIFT	2026-06-13 14:46:22.965832	2026-06-13 14:48:57.044545	\N
47	RICE BOWL BULGOGI	3		\N	MNU-1781336757231			15000.00	t	0.00	0.000	0.000	f	100.00	f	KITCHEN	f	SHIFT	2026-06-13 14:45:57.231369	2026-06-13 14:49:07.371556	\N
46	RICE BOWL THAILAND	3		\N	MNU-1781336733387			15000.00	t	0.00	0.000	0.000	f	100.00	f	KITCHEN	f	SHIFT	2026-06-13 14:45:33.386789	2026-06-13 14:49:13.691118	\N
44	CHIKEN BURGER	3		\N	MNU-1781336668958			14000.00	t	0.00	0.000	0.000	f	100.00	f	KITCHEN	f	SHIFT	2026-06-13 14:44:28.958466	2026-06-13 14:49:24.639477	\N
45	RUJAK CIRENG	3		\N	MNU-1781336685939			15000.00	t	0.00	0.000	0.000	f	100.00	f	KITCHEN	f	SHIFT	2026-06-13 14:44:45.939088	2026-06-13 14:50:21.375078	\N
53	BLUE LAKEN	4		\N	MNU-1781338247723			15000.00	t	0.00	0.000	0.000	f	100.00	f	BAR	f	SHIFT	2026-06-13 15:10:47.6097	2026-06-13 15:14:20.811402	\N
54	KOPI SUSU	4		\N	MNU-1781338266194			10000.00	t	0.00	0.000	0.000	f	100.00	f	BAR	f	SHIFT	2026-06-13 15:11:06.193976	2026-06-13 15:14:36.205238	\N
55	KOPI HITAM	4		\N	MNU-1781338294402			10000.00	t	0.00	0.000	0.000	f	100.00	f	BAR	f	SHIFT	2026-06-13 15:11:34.396848	2026-06-13 15:14:50.487483	\N
56	HOT TEA	4		\N	MNU-1781338332760			10000.00	t	0.00	0.000	0.000	f	100.00	f	BAR	f	SHIFT	2026-06-13 15:12:12.760097	2026-06-13 15:14:55.791969	\N
58	MILO DINO	4		\N	MNU-1781338534515			15000.00	t	0.00	0.000	0.000	f	100.00	f	BAR	f	SHIFT	2026-06-13 15:15:34.515003	2026-06-13 15:15:46.833007	\N
60	AMERICANO ICE	4		\N	MNU-1781338626890			15000.00	t	0.00	0.000	0.000	f	100.00	f	BAR	f	SHIFT	2026-06-13 15:17:06.889386	2026-06-13 15:17:18.041671	\N
71	RED VELVET	4		\N	MNU-1781339254197			15000.00	t	0.00	0.000	0.000	f	100.00	f	BAR	f	SHIFT	2026-06-13 15:27:34.19746	2026-06-13 15:27:45.920968	\N
70	RICH CHOCO	4		\N	MNU-1781339226261			15000.00	t	0.00	0.000	0.000	f	100.00	f	BAR	f	SHIFT	2026-06-13 15:27:06.260784	2026-06-13 15:27:58.519589	\N
69	STRAWBERRY BUBBLEGUM	4		\N	MNU-1781339198642			15000.00	t	0.00	0.000	0.000	f	100.00	f	BAR	f	SHIFT	2026-06-13 15:26:38.64208	2026-06-13 15:28:14.579012	\N
68	BUBLE GUM/PERMEN KARET	4		\N	MNU-1781339169547			15000.00	t	0.00	0.000	0.000	f	100.00	f	BAR	f	SHIFT	2026-06-13 15:26:09.547413	2026-06-13 15:28:25.065421	\N
66	THAI TEA	4		\N	MNU-1781339120626			15000.00	t	0.00	0.000	0.000	f	100.00	f	BAR	f	SHIFT	2026-06-13 15:25:20.625689	2026-06-13 15:28:40.615427	\N
67	MATCHA	4		\N	MNU-1781339139595			15000.00	t	0.00	0.000	0.000	f	100.00	f	BAR	f	SHIFT	2026-06-13 15:25:39.595144	2026-06-13 15:28:51.496053	\N
65	TARO	4		\N	MNU-1781339098872			15000.00	t	0.00	0.000	0.000	f	100.00	f	BAR	f	SHIFT	2026-06-13 15:24:58.872224	2026-06-13 15:28:59.983137	\N
64	COOKIES & CREAM	4		\N	MNU-1781339074748			15000.00	t	0.00	0.000	0.000	f	100.00	f	BAR	f	SHIFT	2026-06-13 15:24:34.746654	2026-06-13 15:29:15.205471	\N
63	CAPPUCINNO	4		\N	MNU-1781339023630			15000.00	t	0.00	0.000	0.000	f	100.00	f	BAR	f	SHIFT	2026-06-13 15:23:43.630395	2026-06-13 15:29:31.470486	\N
62	SALTED CARAMEL LATTE	4		\N	MNU-1781338978059			15000.00	t	0.00	0.000	0.000	f	100.00	f	BAR	f	SHIFT	2026-06-13 15:22:58.058765	2026-06-13 15:29:41.166873	\N
61	PANDAN COFFE	4		\N	MNU-1781338951636			15000.00	t	0.00	0.000	0.000	f	100.00	f	BAR	f	SHIFT	2026-06-13 15:22:31.635737	2026-06-13 15:29:49.632232	\N
72	LYCHEE TEA	4		\N	MNU-1781350966702			10000.00	t	0.00	0.000	0.000	f	100.00	f	BAR	f	SHIFT	2026-06-13 18:42:46.702563	2026-06-13 18:46:38.613843	\N
73	LEMON TEA	4		\N	MNU-1781351390487			10000.00	t	0.00	0.000	0.000	f	100.00	f	BAR	f	SHIFT	2026-06-13 18:49:50.486772	2026-06-13 18:50:17.164576	\N
74	TEMPE KEMUL	3		\N	MNU-1781353927705			12000.00	t	0.00	0.000	0.000	f	100.00	f	KITCHEN	f	SHIFT	2026-06-13 19:32:07.704858	2026-06-13 19:34:31.139335	\N
75	CILOK	3		\N	MNU-1781367653879			12000.00	t	0.00	0.000	0.000	f	100.00	f	KITCHEN	f	SHIFT	2026-06-13 23:20:53.879648	2026-06-13 23:21:23.59925	\N
32	CIMORY SUSU	6		\N	MNU-1781328814981			12000.00	t	0.00	0.000	0.000	f	100.00	f	BAR	f	SHIFT	2026-06-13 12:33:34.981254	2026-06-16 17:30:22.721425	\N
78	PISANG GORENG	3		\N	MNU-1781406849230			15000.00	t	0.00	0.000	0.000	f	100.00	f	KITCHEN	f	SHIFT	2026-06-14 10:14:09.23033	2026-06-14 10:14:19.335575	\N
77	INDOMIE GORENG DOUBLE	3		\N	MNU-1781406814516			15000.00	t	0.00	0.000	0.000	f	100.00	f	KITCHEN	f	SHIFT	2026-06-14 10:13:34.515767	2026-06-14 10:14:28.553773	\N
76	INDOMIE GORENG	3		\N	MNU-1781406795251			8000.00	t	0.00	0.000	0.000	f	100.00	f	KITCHEN	f	SHIFT	2026-06-14 10:13:15.251043	2026-06-14 10:14:34.769999	\N
79	ICE TEA (FREE)	4		\N	MNU-1781420800735			0.00	t	0.00	0.000	0.000	f	100.00	f	CASHIER	f	SHIFT	2026-06-14 14:06:40.734854	2026-06-14 14:06:51.61519	\N
80	HAND GLOVE	6		\N	MNU-1781501557754			20000.00	t	0.00	49.000	1.000	f	100.00	f	CASHIER	f	SHIFT	2026-06-15 12:32:37.753818	2026-06-16 17:45:23.124845	\N
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
1	DONE	38	13	1.000	6000.00	0.00	0.00	t	38		\N	\N	\N	\N	\N	\N	\N	2026-06-13 12:03:11.218	3	\N	\N	2026-06-13 12:03:11.146014	2026-06-13 14:06:02.575843
2	QUEUED	39	39	1.000	15000.00	0.00	0.00	t	39		\N	BDS	\N	\N	\N	\N	\N	\N	3	\N	\N	2026-06-13 14:10:38.011907	2026-06-13 16:00:09.700608
4	DONE	41	40	1.000	6000.00	0.00	0.00	t	40		\N	\N	\N	\N	\N	\N	\N	2026-06-13 18:21:28.817	4	\N	\N	2026-06-13 18:21:28.724501	2026-06-13 19:22:31.285685
3	DONE	40	40	2.000	6000.00	0.00	0.00	t	41		\N	\N	\N	\N	\N	\N	\N	2026-06-13 18:05:36.342	4	\N	\N	2026-06-13 18:05:36.261465	2026-06-13 20:07:01.840413
13	DONE	45	40	1.000	6000.00	0.00	0.00	t	42		\N	\N	\N	\N	\N	\N	\N	2026-06-13 20:26:08.815	4	\N	\N	2026-06-13 20:26:08.739329	2026-06-13 21:47:40.657069
12	DONE	46	40	2.000	6000.00	0.00	0.00	t	43		\N	\N	\N	\N	\N	\N	\N	2026-06-13 20:01:32.02	4	\N	\N	2026-06-13 20:01:31.935815	2026-06-13 22:03:02.809574
5	QUEUED	42	14	1.000	7000.00	0.00	0.00	t	44		\N	BDS	\N	\N	\N	\N	\N	\N	4	\N	\N	2026-06-13 19:09:31.36637	2026-06-13 22:10:52.488001
16	DONE	47	40	2.000	6000.00	0.00	0.00	t	45		\N	\N	\N	\N	\N	\N	\N	2026-06-13 20:33:58.249	4	\N	\N	2026-06-13 20:33:58.15647	2026-06-13 22:27:21.252641
15	QUEUED	47	54	1.000	10000.00	0.00	0.00	t	45		\N	BDS	\N	\N	\N	\N	\N	\N	4	\N	\N	2026-06-13 20:33:34.272545	2026-06-13 22:27:21.252641
14	QUEUED	47	54	1.000	10000.00	0.00	0.00	t	45		\N	BDS	\N	\N	\N	\N	\N	\N	4	\N	\N	2026-06-13 20:33:10.501779	2026-06-13 22:27:21.252641
20	QUEUED	51	43	1.000	15000.00	0.00	0.00	t	46		\N	KDS	\N	\N	\N	\N	\N	\N	4	\N	\N	2026-06-13 21:39:25.284482	2026-06-13 22:33:14.958922
21	QUEUED	51	45	1.000	15000.00	0.00	0.00	t	46		\N	KDS	\N	\N	\N	\N	\N	\N	4	\N	\N	2026-06-13 21:39:52.29998	2026-06-13 22:33:14.958922
22	QUEUED	51	71	1.000	15000.00	0.00	0.00	t	46		\N	BDS	\N	\N	\N	\N	\N	\N	4	\N	\N	2026-06-13 21:40:03.734993	2026-06-13 22:33:14.958922
23	QUEUED	51	68	1.000	15000.00	0.00	0.00	t	46		\N	BDS	\N	\N	\N	\N	\N	\N	4	\N	\N	2026-06-13 21:40:18.949596	2026-06-13 22:33:14.958922
7	QUEUED	43	39	1.000	15000.00	0.00	0.00	t	47		\N	BDS	\N	\N	\N	\N	\N	\N	4	\N	\N	2026-06-13 19:30:33.920284	2026-06-13 22:34:39.683376
8	QUEUED	43	59	2.000	15000.00	0.00	0.00	t	47		\N	BDS	\N	\N	\N	\N	\N	\N	4	\N	\N	2026-06-13 19:30:49.559667	2026-06-13 22:34:39.683376
10	QUEUED	43	45	1.000	15000.00	0.00	0.00	t	47		\N	KDS	\N	\N	\N	\N	\N	\N	4	\N	\N	2026-06-13 19:35:12.220069	2026-06-13 22:34:39.683376
6	QUEUED	43	63	1.000	15000.00	0.00	0.00	t	47		\N	BDS	\N	\N	\N	\N	\N	\N	4	\N	\N	2026-06-13 19:30:15.50635	2026-06-13 22:34:39.683376
9	QUEUED	43	74	1.000	12000.00	0.00	0.00	t	47		\N	KDS	\N	\N	\N	\N	\N	\N	4	\N	\N	2026-06-13 19:35:01.002606	2026-06-13 22:34:39.683376
19	DONE	44	40	1.000	6000.00	0.00	0.00	t	48		\N	\N	\N	\N	\N	\N	\N	2026-06-13 21:19:11.331	4	\N	\N	2026-06-13 21:19:11.252941	2026-06-13 22:34:59.120201
11	QUEUED	44	55	1.000	10000.00	0.00	0.00	t	48		\N	BDS	\N	\N	\N	\N	\N	\N	4	\N	\N	2026-06-13 19:54:03.403214	2026-06-13 22:34:59.120201
17	QUEUED	49	72	1.000	10000.00	0.00	0.00	t	49		\N	BDS	\N	\N	\N	\N	\N	\N	4	\N	\N	2026-06-13 21:08:34.166876	2026-06-13 23:10:01.418163
24	QUEUED	52	39	1.000	15000.00	0.00	0.00	t	50		\N	BDS	\N	\N	\N	\N	\N	\N	4	\N	\N	2026-06-13 21:54:17.112512	2026-06-13 23:39:54.297465
41	DONE	52	40	1.000	6000.00	0.00	0.00	t	50		\N	\N	\N	\N	\N	\N	\N	2026-06-13 23:36:36.979	4	\N	\N	2026-06-13 23:36:36.895576	2026-06-13 23:39:54.297465
25	DONE	53	31	1.000	11000.00	0.00	0.00	t	52		\N	\N	\N	\N	\N	\N	\N	2026-06-13 21:55:57.86	4	\N	\N	2026-06-13 21:55:57.21723	2026-06-14 00:02:37.470492
26	QUEUED	53	39	1.000	15000.00	0.00	0.00	t	52		\N	BDS	\N	\N	\N	\N	\N	\N	4	\N	\N	2026-06-13 21:56:10.165699	2026-06-14 00:02:37.470492
36	DONE	50	40	1.000	6000.00	0.00	0.00	t	53		\N	\N	\N	\N	\N	\N	\N	2026-06-13 23:18:40.894	4	\N	\N	2026-06-13 23:18:40.792427	2026-06-14 00:05:45.343902
18	DONE	50	40	2.000	6000.00	0.00	0.00	t	53		\N	\N	\N	\N	\N	\N	\N	2026-06-13 21:16:35.114	4	\N	\N	2026-06-13 21:16:35.033341	2026-06-14 00:05:45.343902
42	DONE	60	40	1.000	6000.00	0.00	0.00	t	54		\N	\N	\N	\N	\N	\N	\N	2026-06-13 23:53:16.094	4	\N	\N	2026-06-13 23:53:15.910795	2026-06-14 00:13:00.775817
44	QUEUED	48	39	1.000	15000.00	0.00	0.00	t	55		\N	BDS	\N	\N	\N	\N	\N	\N	4	\N	\N	2026-06-14 00:05:12.118516	2026-06-14 00:19:31.945236
43	DONE	48	40	1.000	6000.00	0.00	0.00	t	55		\N	\N	\N	\N	\N	\N	\N	2026-06-14 00:04:58.457	4	\N	\N	2026-06-14 00:04:58.355734	2026-06-14 00:19:31.945236
45	QUEUED	48	55	1.000	10000.00	0.00	0.00	t	55		\N	BDS	\N	\N	\N	\N	\N	\N	4	\N	\N	2026-06-14 00:06:17.758756	2026-06-14 00:19:31.945236
46	DONE	56	40	2.000	6000.00	0.00	0.00	t	56		\N	\N	\N	\N	\N	\N	\N	2026-06-14 00:32:56.08	4	\N	\N	2026-06-14 00:32:55.987745	2026-06-14 00:33:16.264752
29	QUEUED	54	41	1.000	15000.00	0.00	0.00	t	57		\N	KDS	\N	\N	\N	\N	\N	\N	4	\N	\N	2026-06-13 22:12:05.877778	2026-06-14 01:06:54.959454
28	QUEUED	54	64	1.000	15000.00	0.00	0.00	t	57		\N	BDS	\N	\N	\N	\N	\N	\N	4	\N	\N	2026-06-13 22:11:57.828539	2026-06-14 01:06:54.959454
34	QUEUED	59	14	1.000	7000.00	0.00	0.00	t	59		\N	BDS	\N	\N	\N	\N	\N	\N	4	\N	\N	2026-06-13 23:14:49.245033	2026-06-14 01:09:24.231676
40	QUEUED	59	38	1.000	12000.00	0.00	0.00	t	59		\N	KDS	\N	\N	\N	\N	\N	\N	4	\N	\N	2026-06-13 23:22:19.85568	2026-06-14 01:09:24.231676
35	DONE	59	40	2.000	6000.00	0.00	0.00	t	59		\N	\N	\N	\N	\N	\N	\N	2026-06-13 23:14:58.824	4	\N	\N	2026-06-13 23:14:58.743399	2026-06-14 01:09:24.231676
39	QUEUED	59	42	1.000	12000.00	0.00	0.00	t	59		\N	KDS	\N	\N	\N	\N	\N	\N	4	\N	\N	2026-06-13 23:22:02.922705	2026-06-14 01:09:24.231676
38	QUEUED	59	75	1.000	12000.00	0.00	0.00	t	59		\N	KDS	\N	\N	\N	\N	\N	\N	4	\N	\N	2026-06-13 23:21:50.16481	2026-06-14 01:09:24.231676
37	QUEUED	59	75	1.000	12000.00	0.00	0.00	t	59		\N	KDS	\N	\N	\N	\N	\N	\N	4	\N	\N	2026-06-13 23:21:34.742249	2026-06-14 01:09:24.231676
31	QUEUED	55	38	1.000	12000.00	0.00	0.00	t	60		\N	KDS	\N	\N	\N	\N	\N	\N	4	\N	\N	2026-06-13 22:54:15.167027	2026-06-14 01:12:41.346446
30	QUEUED	55	37	1.000	12000.00	0.00	0.00	t	60		\N	KDS	\N	\N	\N	\N	\N	\N	4	\N	\N	2026-06-13 22:54:06.477603	2026-06-14 01:12:41.346446
27	QUEUED	55	69	1.000	15000.00	0.00	0.00	t	60		\N	BDS	\N	\N	\N	\N	\N	\N	4	\N	\N	2026-06-13 22:11:45.289769	2026-06-14 01:12:41.346446
33	QUEUED	55	63	1.000	15000.00	0.00	0.00	t	60		\N	BDS	\N	\N	\N	\N	\N	\N	4	\N	\N	2026-06-13 22:54:37.146999	2026-06-14 01:12:41.346446
49	QUEUED	55	73	1.000	10000.00	0.00	0.00	t	60		\N	BDS	\N	\N	\N	\N	\N	\N	4	\N	\N	2026-06-14 00:53:43.559379	2026-06-14 01:12:41.346446
32	QUEUED	55	73	1.000	10000.00	0.00	0.00	t	60		\N	BDS	\N	\N	\N	\N	\N	\N	4	\N	\N	2026-06-13 22:54:25.210939	2026-06-14 01:12:41.346446
52	QUEUED	61	55	1.000	10000.00	0.00	0.00	t	62		\N	BDS	\N	\N	\N	\N	\N	\N	4	\N	\N	2026-06-14 01:00:04.877206	2026-06-14 02:22:11.658321
53	QUEUED	61	65	1.000	15000.00	0.00	0.00	t	62		\N	BDS	\N	\N	\N	\N	\N	\N	4	\N	\N	2026-06-14 01:00:16.141697	2026-06-14 02:22:11.658321
50	QUEUED	57	67	1.000	15000.00	0.00	0.00	t	64		\N	BDS	\N	\N	\N	\N	\N	\N	4	\N	\N	2026-06-14 00:59:37.52607	2026-06-14 02:56:51.47702
51	QUEUED	57	65	1.000	15000.00	0.00	0.00	t	64		\N	BDS	\N	\N	\N	\N	\N	\N	4	\N	\N	2026-06-14 00:59:50.218765	2026-06-14 02:56:51.47702
47	QUEUED	62	14	1.000	7000.00	0.00	0.00	t	65		\N	BDS	\N	\N	\N	\N	\N	\N	4	\N	\N	2026-06-14 00:46:46.157481	2026-06-14 03:08:09.496918
48	QUEUED	62	54	1.000	10000.00	0.00	0.00	t	65		\N	BDS	\N	\N	\N	\N	\N	\N	4	\N	\N	2026-06-14 00:47:01.829083	2026-06-14 03:08:09.496918
55	QUEUED	65	39	1.000	15000.00	0.00	0.00	t	67		\N	BDS	\N	\N	\N	\N	\N	\N	4	\N	\N	2026-06-14 01:52:43.783545	2026-06-14 04:31:31.24232
54	QUEUED	65	68	1.000	15000.00	0.00	0.00	t	67		\N	BDS	\N	\N	\N	\N	\N	\N	4	\N	\N	2026-06-14 01:52:22.725997	2026-06-14 04:31:31.24232
60	DONE	72	31	1.000	11000.00	0.00	0.00	t	72		\N	\N	\N	\N	\N	\N	\N	2026-06-14 13:22:47.702	3	\N	\N	2026-06-14 13:22:47.636416	2026-06-14 15:23:14.505004
59	DONE	72	40	1.000	6000.00	0.00	0.00	t	72		\N	\N	\N	\N	\N	\N	\N	2026-06-14 13:22:31.371	3	\N	\N	2026-06-14 13:22:31.288635	2026-06-14 15:23:14.505004
67	QUEUED	76	65	2.000	15000.00	0.00	0.00	t	73		\N	BDS	\N	\N	\N	\N	\N	\N	3	\N	\N	2026-06-14 15:06:26.938879	2026-06-14 16:09:03.901597
62	QUEUED	74	14	1.000	7000.00	0.00	0.00	t	74		\N	BDS	\N	\N	\N	\N	\N	\N	3	\N	\N	2026-06-14 14:16:22.553076	2026-06-14 16:31:13.24048
63	DONE	74	40	1.000	6000.00	0.00	0.00	t	74		\N	\N	\N	\N	\N	\N	\N	2026-06-14 14:16:38.451	3	\N	\N	2026-06-14 14:16:38.368029	2026-06-14 16:31:13.24048
65	DONE	73	40	1.000	6000.00	0.00	0.00	t	75		\N	\N	\N	\N	\N	\N	\N	2026-06-14 14:23:38.672	3	\N	\N	2026-06-14 14:23:38.606361	2026-06-14 17:05:25.907731
61	QUEUED	73	79	1.000	0.00	0.00	0.00	t	75		\N	BDS	\N	\N	\N	\N	\N	\N	3	\N	\N	2026-06-14 14:07:04.716185	2026-06-14 17:05:25.907731
66	QUEUED	75	79	1.000	0.00	0.00	0.00	t	77		\N	BDS	\N	\N	\N	\N	\N	\N	3	\N	\N	2026-06-14 14:43:54.721443	2026-06-14 17:43:36.004117
58	DONE	70	40	2.000	6000.00	0.00	0.00	t	78		\N	\N	\N	\N	\N	\N	\N	2026-06-14 12:35:16.862	3	\N	\N	2026-06-14 12:35:16.782257	2026-06-14 18:04:40.881607
56	QUEUED	70	59	2.000	15000.00	0.00	0.00	t	78		\N	BDS	\N	\N	\N	\N	\N	\N	3	\N	\N	2026-06-14 11:56:13.186645	2026-06-14 18:04:40.881607
57	DONE	70	21	1.000	8000.00	0.00	0.00	t	78		\N	\N	\N	\N	\N	\N	\N	2026-06-14 12:14:08.942	3	\N	\N	2026-06-14 12:14:08.85412	2026-06-14 18:04:40.881607
68	QUEUED	77	55	1.000	10000.00	0.00	0.00	t	80		\N	BDS	\N	\N	\N	\N	\N	\N	3	\N	\N	2026-06-14 15:32:31.474091	2026-06-14 18:34:12.305973
70	QUEUED	77	56	1.000	10000.00	0.00	0.00	t	80		\N	BDS	\N	\N	\N	\N	\N	\N	3	\N	\N	2026-06-14 15:54:48.053617	2026-06-14 18:34:12.305973
69	QUEUED	77	79	1.000	0.00	0.00	0.00	t	80		\N	BDS	\N	\N	\N	\N	\N	\N	3	\N	\N	2026-06-14 15:36:24.212603	2026-06-14 18:34:12.305973
143	QUEUED	123	14	2.000	7000.00	0.00	0.00	t	123		\N	BDS	\N	\N	\N	\N	\N	\N	4	\N	\N	2026-06-15 20:24:00.423199	2026-06-15 23:25:40.32393
64	QUEUED	74	73	1.000	10000.00	0.00	0.00	t	74		\N	BDS	\N	\N	\N	\N	\N	\N	3	\N	\N	2026-06-14 14:21:49.546824	2026-06-14 16:31:13.24048
71	DONE	79	24	1.000	12000.00	0.00	0.00	t	76		\N	\N	\N	\N	\N	\N	\N	2026-06-14 17:34:47.594	4	\N	\N	2026-06-14 17:34:47.558239	2026-06-14 17:35:05.7263
85	QUEUED	80	14	1.000	7000.00	0.00	0.00	t	82		\N	BDS	\N	\N	\N	\N	\N	\N	4	\N	\N	2026-06-14 19:14:20.731437	2026-06-14 19:56:46.180909
72	QUEUED	80	55	1.000	10000.00	0.00	0.00	t	82		\N	BDS	\N	\N	\N	\N	\N	\N	4	\N	\N	2026-06-14 18:20:03.511798	2026-06-14 19:56:46.180909
87	QUEUED	80	71	1.000	15000.00	0.00	0.00	t	82		\N	BDS	\N	\N	\N	\N	\N	\N	4	\N	\N	2026-06-14 19:18:56.548197	2026-06-14 19:56:46.180909
76	DONE	83	40	1.000	6000.00	0.00	0.00	t	83		\N	\N	\N	\N	\N	\N	\N	2026-06-14 18:38:02.961	4	\N	\N	2026-06-14 18:38:02.883913	2026-06-14 20:41:15.724213
81	DONE	85	40	1.000	6000.00	0.00	0.00	t	84		\N	\N	\N	\N	\N	\N	\N	2026-06-14 18:56:26.976	4	\N	\N	2026-06-14 18:56:26.815054	2026-06-14 20:45:02.486519
86	QUEUED	85	54	1.000	10000.00	0.00	0.00	t	84		\N	BDS	\N	\N	\N	\N	\N	\N	4	\N	\N	2026-06-14 19:14:30.590284	2026-06-14 20:45:02.486519
82	QUEUED	85	54	1.000	10000.00	0.00	0.00	t	84		\N	BDS	\N	\N	\N	\N	\N	\N	4	\N	\N	2026-06-14 18:57:02.886731	2026-06-14 20:45:02.486519
83	QUEUED	85	68	1.000	15000.00	0.00	0.00	t	84		\N	BDS	\N	\N	\N	\N	\N	\N	4	\N	\N	2026-06-14 18:57:15.459697	2026-06-14 20:45:02.486519
84	DONE	86	40	3.000	6000.00	0.00	0.00	t	85		\N	\N	\N	\N	\N	\N	\N	2026-06-14 19:00:27.142	4	\N	\N	2026-06-14 19:00:27.021357	2026-06-14 21:00:50.242337
94	QUEUED	87	39	1.000	15000.00	0.00	0.00	t	86		\N	BDS	\N	\N	\N	\N	\N	\N	4	\N	\N	2026-06-14 19:47:49.775125	2026-06-14 21:20:45.021148
92	QUEUED	87	71	1.000	15000.00	0.00	0.00	t	86		\N	BDS	\N	\N	\N	\N	\N	\N	4	\N	\N	2026-06-14 19:34:51.204278	2026-06-14 21:20:45.021148
93	QUEUED	87	72	1.000	10000.00	0.00	0.00	t	86		\N	BDS	\N	\N	\N	\N	\N	\N	4	\N	\N	2026-06-14 19:47:31.32705	2026-06-14 21:20:45.021148
73	DONE	81	40	2.000	6000.00	0.00	0.00	t	87		\N	\N	\N	\N	\N	\N	\N	2026-06-14 18:32:02.251	4	\N	\N	2026-06-14 18:32:02.177667	2026-06-14 21:27:04.598536
74	QUEUED	81	54	1.000	10000.00	0.00	0.00	t	87		\N	BDS	\N	\N	\N	\N	\N	\N	4	\N	\N	2026-06-14 18:32:34.320965	2026-06-14 21:27:04.598536
75	QUEUED	81	79	1.000	0.00	0.00	0.00	t	87		\N	BDS	\N	\N	\N	\N	\N	\N	4	\N	\N	2026-06-14 18:32:44.909657	2026-06-14 21:27:04.598536
95	QUEUED	89	72	2.000	10000.00	0.00	0.00	t	88		\N	BDS	\N	\N	\N	\N	\N	\N	4	\N	\N	2026-06-14 20:01:39.547808	2026-06-14 21:34:06.478236
78	QUEUED	84	14	2.000	7000.00	0.00	0.00	t	89		\N	BDS	\N	\N	\N	\N	\N	\N	4	\N	\N	2026-06-14 18:55:22.149867	2026-06-14 21:42:20.156176
80	DONE	84	40	1.000	6000.00	0.00	0.00	t	89		\N	\N	\N	\N	\N	\N	\N	2026-06-14 18:55:44.23	4	\N	\N	2026-06-14 18:55:44.074098	2026-06-14 21:42:20.156176
79	QUEUED	84	72	1.000	10000.00	0.00	0.00	t	89		\N	BDS	\N	\N	\N	\N	\N	\N	4	\N	\N	2026-06-14 18:55:34.502768	2026-06-14 21:42:20.156176
77	QUEUED	84	79	1.000	0.00	0.00	0.00	t	89		\N	BDS	\N	\N	\N	\N	\N	\N	4	\N	\N	2026-06-14 18:55:06.695823	2026-06-14 21:42:20.156176
90	QUEUED	88	59	1.000	15000.00	0.00	0.00	t	90		\N	BDS	\N	\N	\N	\N	\N	\N	4	\N	\N	2026-06-14 19:26:28.359993	2026-06-14 22:29:17.050454
89	QUEUED	88	61	1.000	15000.00	0.00	0.00	t	90		\N	BDS	\N	\N	\N	\N	\N	\N	4	\N	\N	2026-06-14 19:26:18.447629	2026-06-14 22:29:17.050454
91	QUEUED	88	74	1.000	12000.00	0.00	0.00	t	90		\N	KDS	\N	\N	\N	\N	\N	\N	4	\N	\N	2026-06-14 19:26:40.53542	2026-06-14 22:29:17.050454
88	QUEUED	88	79	1.000	0.00	0.00	0.00	t	90		\N	BDS	\N	\N	\N	\N	\N	\N	4	\N	\N	2026-06-14 19:26:07.892981	2026-06-14 22:29:17.050454
99	DONE	91	40	1.000	6000.00	0.00	0.00	t	92		\N	\N	\N	\N	\N	\N	\N	2026-06-14 21:27:50.559	4	\N	\N	2026-06-14 21:27:50.465124	2026-06-14 22:47:02.982919
101	QUEUED	95	14	2.000	7000.00	0.00	0.00	t	94		\N	BDS	\N	\N	\N	\N	\N	\N	4	\N	\N	2026-06-14 22:05:23.986634	2026-06-14 23:04:15.146906
100	QUEUED	95	56	1.000	10000.00	0.00	0.00	t	94		\N	BDS	\N	\N	\N	\N	\N	\N	4	\N	\N	2026-06-14 22:05:06.929608	2026-06-14 23:04:15.146906
105	QUEUED	97	70	1.000	15000.00	0.00	0.00	t	95		\N	BDS	\N	\N	\N	\N	\N	\N	4	\N	\N	2026-06-14 23:27:17.214937	2026-06-15 00:04:26.963423
106	QUEUED	97	72	1.000	10000.00	0.00	0.00	t	95		\N	BDS	\N	\N	\N	\N	\N	\N	4	\N	\N	2026-06-14 23:27:26.007205	2026-06-15 00:04:26.963423
102	QUEUED	93	73	1.000	10000.00	0.00	0.00	t	96		\N	BDS	\N	\N	\N	\N	\N	\N	4	\N	\N	2026-06-14 22:15:47.068711	2026-06-15 00:28:08.257129
97	DONE	92	36	1.000	10000.00	0.00	0.00	t	97		\N	\N	\N	\N	\N	\N	\N	2026-06-14 21:02:36.094	4	\N	\N	2026-06-14 21:02:35.980223	2026-06-15 00:29:15.348229
98	DONE	92	31	1.000	11000.00	0.00	0.00	t	97		\N	\N	\N	\N	\N	\N	\N	2026-06-14 21:02:44.837	4	\N	\N	2026-06-14 21:02:44.650953	2026-06-15 00:29:15.348229
96	QUEUED	92	79	1.000	0.00	0.00	0.00	t	97		\N	BDS	\N	\N	\N	\N	\N	\N	4	\N	\N	2026-06-14 21:02:23.472426	2026-06-15 00:29:15.348229
103	QUEUED	96	14	2.000	7000.00	0.00	0.00	t	98		\N	BDS	\N	\N	\N	\N	\N	\N	4	\N	\N	2026-06-14 22:37:12.891816	2026-06-15 00:45:52.622217
104	QUEUED	98	60	1.000	15000.00	0.00	0.00	t	99		\N	BDS	\N	\N	\N	\N	\N	\N	4	\N	\N	2026-06-14 23:05:35.202638	2026-06-15 00:47:02.823051
109	DONE	99	33	1.000	12000.00	0.00	0.00	t	101		\N	\N	\N	\N	\N	\N	\N	2026-06-14 23:38:21.118	4	\N	\N	2026-06-14 23:38:21.027612	2026-06-15 01:38:47.499338
107	QUEUED	99	38	1.000	12000.00	0.00	0.00	t	101		\N	KDS	\N	\N	\N	\N	\N	\N	4	\N	\N	2026-06-14 23:37:36.397495	2026-06-15 01:38:47.499338
108	DONE	99	40	1.000	6000.00	0.00	0.00	t	101		\N	\N	\N	\N	\N	\N	\N	2026-06-14 23:38:08.31	4	\N	\N	2026-06-14 23:38:08.143592	2026-06-15 01:38:47.499338
110	DONE	104	40	2.000	6000.00	0.00	0.00	t	105		\N	\N	\N	\N	\N	\N	\N	2026-06-15 10:37:28.303	4	\N	\N	2026-06-15 10:37:28.126018	2026-06-15 12:11:46.527492
111	QUEUED	105	14	2.000	7000.00	0.00	0.00	t	106		\N	BDS	\N	\N	\N	\N	\N	\N	4	\N	\N	2026-06-15 10:55:24.092736	2026-06-15 12:19:44.015087
118	QUEUED	106	51	1.000	4000.00	0.00	0.00	t	108		\N	KDS	\N	\N	\N	\N	\N	\N	4	\N	\N	2026-06-15 12:40:05.628764	2026-06-15 14:28:26.291459
113	QUEUED	106	14	1.000	7000.00	0.00	0.00	t	108		\N	BDS	\N	\N	\N	\N	\N	\N	4	\N	\N	2026-06-15 11:24:17.401569	2026-06-15 14:28:26.291459
115	QUEUED	106	52	1.000	1000.00	0.00	0.00	t	108		\N	BDS	\N	\N	\N	\N	\N	\N	4	\N	\N	2026-06-15 12:24:20.86842	2026-06-15 14:28:26.291459
114	DONE	106	23	1.000	10000.00	0.00	0.00	t	108		\N	\N	\N	\N	\N	\N	\N	2026-06-15 12:23:49.448	4	\N	\N	2026-06-15 12:23:49.349618	2026-06-15 14:28:26.291459
117	QUEUED	106	76	1.000	8000.00	0.00	0.00	t	108		\N	KDS	\N	\N	\N	\N	\N	\N	4	\N	\N	2026-06-15 12:39:53.450402	2026-06-15 14:28:26.291459
112	QUEUED	106	79	1.000	0.00	0.00	0.00	t	108		\N	BDS	\N	\N	\N	\N	\N	\N	4	\N	\N	2026-06-15 11:24:03.971944	2026-06-15 14:28:26.291459
116	DONE	108	80	1.000	20000.00	0.00	0.00	t	109		\N	\N	\N	\N	\N	\N	\N	2026-06-15 12:33:51.476	4	\N	\N	2026-06-15 12:33:51.397259	2026-06-15 14:29:24.337801
125	DONE	113	32	1.000	12000.00	0.00	0.00	t	111		\N	\N	\N	\N	\N	\N	\N	2026-06-15 14:53:21.727	4	\N	\N	2026-06-15 14:53:21.569905	2026-06-15 14:53:30.884212
122	QUEUED	111	14	2.000	7000.00	0.00	0.00	t	112		\N	BDS	\N	\N	\N	\N	\N	\N	4	\N	\N	2026-06-15 13:53:51.026684	2026-06-15 16:49:56.718504
121	QUEUED	111	79	1.000	0.00	0.00	0.00	t	112		\N	BDS	\N	\N	\N	\N	\N	\N	4	\N	\N	2026-06-15 13:53:30.255497	2026-06-15 16:49:56.718504
126	QUEUED	112	14	1.000	7000.00	0.00	0.00	t	113		\N	BDS	\N	\N	\N	\N	\N	\N	4	\N	\N	2026-06-15 15:27:53.202613	2026-06-15 16:51:10.373661
124	QUEUED	112	60	1.000	15000.00	0.00	0.00	t	113		\N	BDS	\N	\N	\N	\N	\N	\N	4	\N	\N	2026-06-15 14:50:35.572822	2026-06-15 16:51:10.373661
127	QUEUED	114	39	1.000	15000.00	0.00	0.00	t	114		\N	BDS	\N	\N	\N	\N	\N	\N	4	\N	\N	2026-06-15 15:49:09.722383	2026-06-15 16:53:27.484375
123	DONE	110	40	1.000	6000.00	0.00	0.00	t	115		\N	\N	\N	\N	\N	\N	\N	2026-06-15 14:11:31.891	4	\N	\N	2026-06-15 14:11:31.822777	2026-06-15 17:24:12.996793
120	DONE	110	40	1.000	6000.00	0.00	0.00	t	115		\N	\N	\N	\N	\N	\N	\N	2026-06-15 13:45:44.355	4	\N	\N	2026-06-15 13:45:44.197236	2026-06-15 17:24:12.996793
119	QUEUED	110	79	1.000	0.00	0.00	0.00	t	115		\N	BDS	\N	\N	\N	\N	\N	\N	4	\N	\N	2026-06-15 13:19:01.200494	2026-06-15 17:24:12.996793
128	QUEUED	115	53	1.000	15000.00	0.00	0.00	t	116		\N	BDS	\N	\N	\N	\N	\N	\N	4	\N	\N	2026-06-15 16:05:12.193182	2026-06-15 18:36:43.943587
130	QUEUED	116	14	2.000	7000.00	0.00	0.00	t	118		\N	BDS	\N	\N	\N	\N	\N	\N	4	\N	\N	2026-06-15 19:05:37.095718	2026-06-15 20:37:40.322677
129	QUEUED	117	14	3.000	7000.00	0.00	0.00	t	119		\N	BDS	\N	\N	\N	\N	\N	\N	4	\N	\N	2026-06-15 19:05:27.250687	2026-06-15 21:06:07.714626
133	QUEUED	118	39	1.000	15000.00	0.00	0.00	t	120		\N	BDS	\N	\N	\N	\N	\N	\N	4	\N	\N	2026-06-15 19:36:38.169981	2026-06-15 21:14:24.265814
139	QUEUED	120	39	1.000	15000.00	0.00	0.00	t	121		\N	BDS	\N	\N	\N	\N	\N	\N	4	\N	\N	2026-06-15 19:59:50.09798	2026-06-15 21:47:17.318482
134	DONE	120	40	1.000	6000.00	0.00	0.00	t	121		\N	\N	\N	\N	\N	\N	\N	2026-06-15 19:43:18.764	4	\N	\N	2026-06-15 19:43:18.281853	2026-06-15 21:47:17.318482
136	DONE	122	15	1.000	12000.00	0.00	0.00	t	122		\N	\N	\N	\N	\N	\N	\N	2026-06-15 19:48:00.702	4	\N	\N	2026-06-15 19:48:00.618432	2026-06-15 22:20:45.736138
140	DONE	122	15	1.000	12000.00	0.00	0.00	t	122		\N	\N	\N	\N	\N	\N	\N	2026-06-15 20:14:32.005	4	\N	\N	2026-06-15 20:14:31.933045	2026-06-15 22:20:45.736138
141	QUEUED	122	41	1.000	15000.00	0.00	0.00	t	122		\N	KDS	\N	\N	\N	\N	\N	\N	4	\N	\N	2026-06-15 20:14:41.893872	2026-06-15 22:20:45.736138
142	QUEUED	123	79	1.000	0.00	0.00	0.00	t	123		\N	BDS	\N	\N	\N	\N	\N	\N	4	\N	\N	2026-06-15 20:23:49.243105	2026-06-15 23:25:40.32393
131	DONE	119	80	1.000	20000.00	0.00	0.00	t	117		\N	\N	\N	\N	\N	\N	\N	2026-06-15 19:31:41.78	4	\N	\N	2026-06-15 19:31:41.712449	2026-06-15 20:32:13.294412
135	DONE	118	40	1.000	6000.00	0.00	0.00	t	120		\N	\N	\N	\N	\N	\N	\N	2026-06-15 19:44:27.998	4	\N	\N	2026-06-15 19:44:27.575055	2026-06-15 21:14:24.265814
132	QUEUED	118	59	1.000	15000.00	0.00	0.00	t	120		\N	BDS	\N	\N	\N	\N	\N	\N	4	\N	\N	2026-06-15 19:36:29.200642	2026-06-15 21:14:24.265814
137	DONE	120	26	1.000	15000.00	0.00	0.00	t	121		\N	\N	\N	\N	\N	\N	\N	2026-06-15 19:59:01.138	4	\N	\N	2026-06-15 19:59:00.978712	2026-06-15 21:47:17.318482
138	QUEUED	120	42	1.000	12000.00	0.00	0.00	t	121		\N	KDS	\N	\N	\N	\N	\N	\N	4	\N	\N	2026-06-15 19:59:39.909594	2026-06-15 21:47:17.318482
145	DONE	122	40	1.000	6000.00	0.00	0.00	t	122		\N	\N	\N	\N	\N	\N	\N	2026-06-15 20:59:31.903	4	\N	\N	2026-06-15 20:59:31.796049	2026-06-15 22:20:45.736138
151	QUEUED	127	72	1.000	10000.00	0.00	0.00	t	124		\N	BDS	\N	\N	\N	\N	\N	\N	4	\N	\N	2026-06-15 21:41:55.492545	2026-06-15 23:29:55.476401
147	QUEUED	125	39	2.000	15000.00	0.00	0.00	t	125		\N	BDS	\N	\N	\N	\N	\N	\N	4	\N	\N	2026-06-15 21:30:14.912015	2026-06-15 23:34:27.20734
148	QUEUED	125	41	1.000	15000.00	0.00	0.00	t	125		\N	KDS	\N	\N	\N	\N	\N	\N	4	\N	\N	2026-06-15 21:30:24.530426	2026-06-15 23:34:27.20734
149	QUEUED	125	53	1.000	15000.00	0.00	0.00	t	125		\N	BDS	\N	\N	\N	\N	\N	\N	4	\N	\N	2026-06-15 21:38:43.259211	2026-06-15 23:34:27.20734
146	QUEUED	124	79	1.000	0.00	0.00	0.00	t	127		\N	BDS	\N	\N	\N	\N	\N	\N	4	\N	\N	2026-06-15 21:03:11.572499	2026-06-15 23:46:07.0036
144	DONE	121	40	1.000	6000.00	0.00	0.00	t	128		\N	\N	\N	\N	\N	\N	\N	2026-06-15 20:59:17.929	4	\N	\N	2026-06-15 20:59:17.80725	2026-06-16 00:11:39.472509
156	QUEUED	121	58	1.000	15000.00	0.00	0.00	t	128		\N	BDS	\N	\N	\N	\N	\N	\N	4	\N	\N	2026-06-15 22:56:53.516838	2026-06-16 00:11:39.472509
157	QUEUED	121	67	1.000	15000.00	0.00	0.00	t	128		\N	BDS	\N	\N	\N	\N	\N	\N	4	\N	\N	2026-06-15 22:57:03.950872	2026-06-16 00:11:39.472509
152	DONE	129	29	1.000	15000.00	0.00	0.00	t	129		\N	\N	\N	\N	\N	\N	\N	2026-06-15 21:59:21.888	4	\N	\N	2026-06-15 21:59:21.751817	2026-06-16 00:25:26.958084
155	DONE	129	31	1.000	11000.00	0.00	0.00	t	129		\N	\N	\N	\N	\N	\N	\N	2026-06-15 21:59:53.855	4	\N	\N	2026-06-15 21:59:53.686232	2026-06-16 00:25:26.958084
153	QUEUED	129	45	1.000	15000.00	0.00	0.00	t	129		\N	KDS	\N	\N	\N	\N	\N	\N	4	\N	\N	2026-06-15 21:59:30.424325	2026-06-16 00:25:26.958084
154	QUEUED	129	54	1.000	10000.00	0.00	0.00	t	129		\N	BDS	\N	\N	\N	\N	\N	\N	4	\N	\N	2026-06-15 21:59:44.585808	2026-06-16 00:25:26.958084
158	QUEUED	129	73	1.000	10000.00	0.00	0.00	t	129		\N	BDS	\N	\N	\N	\N	\N	\N	4	\N	\N	2026-06-15 23:49:35.992215	2026-06-16 00:25:26.958084
150	DONE	126	40	1.000	6000.00	0.00	0.00	t	131		\N	\N	\N	\N	\N	\N	\N	2026-06-15 21:39:28.423	4	\N	\N	2026-06-15 21:39:28.333375	2026-06-16 00:26:46.350686
159	DONE	130	40	1.000	6000.00	0.00	0.00	t	132		\N	\N	\N	\N	\N	\N	\N	2026-06-16 00:01:23.542	4	\N	\N	2026-06-16 00:01:23.196549	2026-06-16 01:39:42.932458
169	QUEUED	132	14	1.000	7000.00	0.00	0.00	t	134		\N	BDS	\N	\N	\N	\N	\N	\N	3	\N	\N	2026-06-16 12:10:10.612713	2026-06-16 12:12:05.507979
165	QUEUED	132	14	1.000	7000.00	0.00	0.00	t	134		\N	BDS	\N	\N	\N	\N	\N	\N	3	\N	\N	2026-06-16 11:15:36.218052	2026-06-16 12:12:05.507979
170	DONE	136	24	1.000	12000.00	0.00	0.00	t	135		\N	\N	\N	\N	\N	\N	\N	2026-06-16 12:33:18.813	3	\N	\N	2026-06-16 12:33:18.676667	2026-06-16 13:47:58.71211
163	DONE	134	40	1.000	6000.00	0.00	0.00	t	136		\N	\N	\N	\N	\N	\N	\N	2026-06-16 11:04:30.304	3	\N	\N	2026-06-16 11:04:30.214614	2026-06-16 14:07:03.301473
162	QUEUED	134	63	1.000	15000.00	0.00	0.00	t	136		\N	BDS	\N	\N	\N	\N	\N	\N	3	\N	\N	2026-06-16 11:04:21.671086	2026-06-16 14:07:03.301473
161	QUEUED	134	79	1.000	0.00	0.00	0.00	t	136		\N	BDS	\N	\N	\N	\N	\N	\N	3	\N	\N	2026-06-16 11:04:12.685676	2026-06-16 14:07:03.301473
164	DONE	133	40	2.000	6000.00	0.00	0.00	t	137		\N	\N	\N	\N	\N	\N	\N	2026-06-16 11:15:22.385	3	\N	\N	2026-06-16 11:15:22.29318	2026-06-16 15:09:13.431452
160	QUEUED	133	79	1.000	0.00	0.00	0.00	t	137		\N	BDS	\N	\N	\N	\N	\N	\N	3	\N	\N	2026-06-16 10:56:47.72527	2026-06-16 15:09:13.431452
167	QUEUED	135	14	1.000	7000.00	0.00	0.00	t	138		\N	BDS	\N	\N	\N	\N	\N	\N	3	\N	\N	2026-06-16 11:39:33.677537	2026-06-16 15:39:52.290939
168	QUEUED	135	41	1.000	15000.00	0.00	0.00	t	138		\N	KDS	\N	\N	\N	\N	\N	\N	3	\N	\N	2026-06-16 11:39:42.950316	2026-06-16 15:39:52.290939
166	QUEUED	135	79	1.000	0.00	0.00	0.00	t	138		\N	BDS	\N	\N	\N	\N	\N	\N	3	\N	\N	2026-06-16 11:39:13.881918	2026-06-16 15:39:52.290939
173	QUEUED	137	45	1.000	15000.00	0.00	0.00	t	139		\N	KDS	\N	\N	\N	\N	\N	\N	3	\N	\N	2026-06-16 13:00:02.580565	2026-06-16 16:00:59.197879
172	QUEUED	137	71	2.000	15000.00	0.00	0.00	t	139		\N	BDS	\N	\N	\N	\N	\N	\N	3	\N	\N	2026-06-16 12:59:53.411898	2026-06-16 16:00:59.197879
171	QUEUED	137	79	1.000	0.00	0.00	0.00	t	139		\N	BDS	\N	\N	\N	\N	\N	\N	3	\N	\N	2026-06-16 12:59:43.049753	2026-06-16 16:00:59.197879
181	DONE	140	40	1.000	6000.00	0.00	0.00	t	140		\N	\N	\N	\N	\N	\N	\N	2026-06-16 17:43:19.789	4	\N	\N	2026-06-16 17:43:19.415286	2026-06-16 17:51:37.173123
177	DONE	140	40	1.000	6000.00	0.00	0.00	t	140		\N	\N	\N	\N	\N	\N	\N	2026-06-16 15:48:13.817	3	\N	\N	2026-06-16 15:48:13.669249	2026-06-16 17:51:37.173123
174	QUEUED	138	55	1.000	10000.00	0.00	0.00	t	141		\N	BDS	\N	\N	\N	\N	\N	\N	3	\N	\N	2026-06-16 15:40:18.979787	2026-06-16 18:19:09.992609
179	DONE	138	32	1.000	12000.00	0.00	0.00	t	141		\N	\N	\N	\N	\N	\N	\N	2026-06-16 17:42:52.571	4	\N	\N	2026-06-16 17:42:52.380625	2026-06-16 18:19:09.992609
176	QUEUED	138	79	1.000	0.00	0.00	0.00	t	141		\N	BDS	\N	\N	\N	\N	\N	\N	3	\N	\N	2026-06-16 15:41:10.881004	2026-06-16 18:19:09.992609
178	QUEUED	139	37	1.000	12000.00	0.00	0.00	t	142		\N	KDS	\N	\N	\N	\N	\N	\N	3	\N	\N	2026-06-16 16:48:32.606521	2026-06-16 18:27:04.055265
180	QUEUED	139	73	1.000	10000.00	0.00	0.00	t	142		\N	BDS	\N	\N	\N	\N	\N	\N	4	\N	\N	2026-06-16 17:43:05.607903	2026-06-16 18:27:04.055265
175	QUEUED	139	73	2.000	10000.00	0.00	0.00	t	142		\N	BDS	\N	\N	\N	\N	\N	\N	3	\N	\N	2026-06-16 15:40:44.270788	2026-06-16 18:27:04.055265
183	DONE	141	40	1.000	6000.00	0.00	0.00	t	144		\N	\N	\N	\N	\N	\N	\N	2026-06-16 18:55:38.99	4	\N	\N	2026-06-16 18:55:38.914226	2026-06-16 20:56:55.788337
182	DONE	141	40	1.000	6000.00	0.00	0.00	t	144		\N	\N	\N	\N	\N	\N	\N	2026-06-16 18:54:33.899	4	\N	\N	2026-06-16 18:54:33.747569	2026-06-16 20:56:55.788337
186	QUEUED	145	58	1.000	15000.00	0.00	0.00	t	146		\N	BDS	\N	\N	\N	\N	\N	\N	4	\N	\N	2026-06-16 19:33:49.974483	2026-06-16 21:35:43.657613
197	QUEUED	152	14	1.000	7000.00	0.00	0.00	t	147		\N	BDS	\N	\N	\N	\N	\N	\N	4	\N	\N	2026-06-16 21:31:19.588971	2026-06-16 21:55:42.645789
196	QUEUED	152	73	1.000	10000.00	0.00	0.00	t	147		\N	BDS	\N	\N	\N	\N	\N	\N	4	\N	\N	2026-06-16 21:31:19.588971	2026-06-16 21:55:42.645789
187	QUEUED	147	49	1.000	15000.00	0.00	0.00	t	148		\N	KDS	\N	\N	\N	\N	\N	\N	4	\N	\N	2026-06-16 20:02:29.879402	2026-06-16 22:06:13.88559
188	QUEUED	147	63	1.000	15000.00	0.00	0.00	t	148		\N	BDS	\N	\N	\N	\N	\N	\N	4	\N	\N	2026-06-16 20:02:43.112162	2026-06-16 22:06:13.88559
185	QUEUED	142	55	1.000	10000.00	0.00	0.00	t	149		\N	BDS	\N	\N	\N	\N	\N	\N	4	\N	\N	2026-06-16 19:09:28.551431	2026-06-16 22:10:36.838037
184	QUEUED	142	79	1.000	0.00	0.00	0.00	t	149		\N	BDS	\N	\N	\N	\N	\N	\N	4	\N	\N	2026-06-16 18:58:51.117763	2026-06-16 22:10:36.838037
191	DONE	149	40	1.000	6000.00	0.00	0.00	t	152		\N	\N	\N	\N	\N	\N	\N	2026-06-16 20:36:08.939	4	\N	\N	2026-06-16 20:36:08.867333	2026-06-16 22:35:58.648068
189	QUEUED	149	65	2.000	15000.00	0.00	0.00	t	152		\N	BDS	\N	\N	\N	\N	\N	\N	4	\N	\N	2026-06-16 20:33:55.223848	2026-06-16 22:35:58.648068
190	DONE	149	80	1.000	20000.00	0.00	0.00	t	152		\N	\N	\N	\N	\N	\N	\N	2026-06-16 20:34:08.326	4	\N	\N	2026-06-16 20:34:08.218904	2026-06-16 22:35:58.648068
195	QUEUED	151	14	2.000	7000.00	0.00	0.00	t	156		\N	BDS	\N	\N	\N	\N	\N	\N	4	\N	\N	2026-06-16 21:16:07.237639	2026-06-17 00:31:03.148138
193	QUEUED	151	65	1.000	15000.00	0.00	0.00	t	156		\N	BDS	\N	\N	\N	\N	\N	\N	4	\N	\N	2026-06-16 21:14:35.370806	2026-06-17 00:31:03.148138
194	QUEUED	151	64	1.000	15000.00	0.00	0.00	t	156		\N	BDS	\N	\N	\N	\N	\N	\N	4	\N	\N	2026-06-16 21:15:41.534369	2026-06-17 00:31:03.148138
192	QUEUED	151	61	1.000	15000.00	0.00	0.00	t	156		\N	BDS	\N	\N	\N	\N	\N	\N	4	\N	\N	2026-06-16 21:14:35.370806	2026-06-17 00:31:03.148138
199	DONE	155	40	1.000	6000.00	0.00	0.00	t	157		\N	\N	\N	\N	\N	\N	\N	2026-06-16 23:38:05.417	4	\N	\N	2026-06-16 23:38:05.275858	2026-06-17 01:36:58.624882
200	QUEUED	155	72	1.000	10000.00	0.00	0.00	t	157		\N	BDS	\N	\N	\N	\N	\N	\N	4	\N	\N	2026-06-17 00:26:38.12435	2026-06-17 01:36:58.624882
198	QUEUED	155	73	1.000	10000.00	0.00	0.00	t	157		\N	BDS	\N	\N	\N	\N	\N	\N	4	\N	\N	2026-06-16 23:35:39.975841	2026-06-17 01:36:58.624882
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
50	52	0.00	100.00	0.00	0.00	3.00	35.00		2026-06-13 15:10:12.190637	2026-06-13 15:14:12.842126
51	53	0.00	100.00	0.00	0.00	3.00	35.00		2026-06-13 15:10:47.6097	2026-06-13 15:14:20.811402
52	54	0.00	100.00	0.00	0.00	3.00	35.00		2026-06-13 15:11:06.193976	2026-06-13 15:14:36.205238
53	55	0.00	100.00	0.00	0.00	3.00	35.00		2026-06-13 15:11:34.396848	2026-06-13 15:14:50.487483
54	56	0.00	100.00	0.00	0.00	3.00	35.00		2026-06-13 15:12:12.760097	2026-06-13 15:14:55.791969
12	13	0.00	100.00	0.00	0.00	3.00	35.00		2026-06-13 12:02:23.648637	2026-06-13 14:12:29.938092
38	40	0.00	100.00	0.00	0.00	3.00	35.00		2026-06-13 14:14:05.895938	2026-06-13 14:14:53.216449
55	58	0.00	100.00	0.00	0.00	3.00	35.00		2026-06-13 15:15:34.515003	2026-06-13 15:15:46.833007
25	26	0.00	100.00	0.00	0.00	3.00	35.00		2026-06-13 12:27:33.621329	2026-06-13 14:15:58.661344
24	25	0.00	100.00	0.00	0.00	3.00	35.00		2026-06-13 12:26:29.015217	2026-06-13 14:16:19.574995
23	24	0.00	100.00	0.00	0.00	3.00	35.00		2026-06-13 12:25:40.474451	2026-06-13 14:16:34.840984
33	35	0.00	100.00	0.00	0.00	3.00	35.00		2026-06-13 12:54:44.527687	2026-06-13 14:21:03.733037
56	59	0.00	100.00	0.00	0.00	3.00	35.00		2026-06-13 15:16:14.275416	2026-06-13 15:16:22.853364
21	22	0.00	100.00	0.00	0.00	3.00	35.00		2026-06-13 12:24:14.045837	2026-06-13 14:22:40.063508
20	21	0.00	100.00	0.00	0.00	3.00	35.00		2026-06-13 12:23:45.100636	2026-06-13 14:22:54.026256
19	20	0.00	100.00	0.00	0.00	3.00	35.00		2026-06-13 12:23:04.456123	2026-06-13 14:23:04.941434
18	19	0.00	100.00	0.00	0.00	3.00	35.00		2026-06-13 12:22:15.863792	2026-06-13 14:23:25.185217
57	60	0.00	100.00	0.00	0.00	3.00	35.00		2026-06-13 15:17:06.889386	2026-06-13 15:17:18.041671
32	33	0.00	100.00	0.00	0.00	3.00	35.00		2026-06-13 12:45:14.462702	2026-06-13 14:24:50.3706
34	36	0.00	100.00	0.00	0.00	3.00	35.00		2026-06-13 12:56:05.571482	2026-06-13 14:25:13.698946
28	29	0.00	100.00	0.00	0.00	3.00	35.00		2026-06-13 12:28:34.277549	2026-06-13 14:25:36.163883
26	27	0.00	100.00	0.00	0.00	3.00	35.00		2026-06-13 12:27:56.228214	2026-06-13 14:25:52.039749
27	28	0.00	100.00	0.00	0.00	3.00	35.00		2026-06-13 12:28:12.674019	2026-06-13 14:26:00.677819
68	71	0.00	100.00	0.00	0.00	3.00	35.00		2026-06-13 15:27:34.19746	2026-06-13 15:27:45.920968
67	70	0.00	100.00	0.00	0.00	3.00	35.00		2026-06-13 15:27:06.260784	2026-06-13 15:27:58.519589
66	69	0.00	100.00	0.00	0.00	3.00	35.00		2026-06-13 15:26:38.64208	2026-06-13 15:28:14.579012
65	68	0.00	100.00	0.00	0.00	3.00	35.00		2026-06-13 15:26:09.547413	2026-06-13 15:28:25.065421
63	66	0.00	100.00	0.00	0.00	3.00	35.00		2026-06-13 15:25:20.625689	2026-06-13 15:28:40.615427
64	67	0.00	100.00	0.00	0.00	3.00	35.00		2026-06-13 15:25:39.595144	2026-06-13 15:28:51.496053
62	65	0.00	100.00	0.00	0.00	3.00	35.00		2026-06-13 15:24:58.872224	2026-06-13 15:28:59.983137
36	38	0.00	100.00	0.00	0.00	3.00	35.00		2026-06-13 13:09:03.239861	2026-06-13 14:32:39.240654
39	41	0.00	100.00	0.00	0.00	3.00	35.00		2026-06-13 14:35:59.275406	2026-06-13 14:36:11.11276
40	42	0.00	100.00	0.00	0.00	3.00	35.00		2026-06-13 14:38:12.049866	2026-06-13 14:38:31.717546
35	37	0.00	100.00	0.00	0.00	3.00	35.00		2026-06-13 13:08:38.069896	2026-06-13 14:41:33.743148
14	15	0.00	100.00	0.00	0.00	3.00	35.00		2026-06-13 12:16:09.577745	2026-06-13 14:42:29.156457
61	64	0.00	100.00	0.00	0.00	3.00	35.00		2026-06-13 15:24:34.746654	2026-06-13 15:29:15.205471
41	43	0.00	100.00	0.00	0.00	3.00	35.00		2026-06-13 14:43:55.038052	2026-06-13 14:44:04.159101
46	48	0.00	100.00	0.00	0.00	3.00	35.00		2026-06-13 14:46:22.965832	2026-06-13 14:48:57.044545
45	47	0.00	100.00	0.00	0.00	3.00	35.00		2026-06-13 14:45:57.231369	2026-06-13 14:49:07.371556
44	46	0.00	100.00	0.00	0.00	3.00	35.00		2026-06-13 14:45:33.386789	2026-06-13 14:49:13.691118
42	44	0.00	100.00	0.00	0.00	3.00	35.00		2026-06-13 14:44:28.958466	2026-06-13 14:49:24.639477
43	45	0.00	100.00	0.00	0.00	3.00	35.00		2026-06-13 14:44:45.939088	2026-06-13 14:50:21.375078
49	51	0.00	100.00	0.00	0.00	3.00	35.00		2026-06-13 14:53:14.613546	2026-06-13 14:53:23.103197
48	50	0.00	100.00	0.00	0.00	3.00	35.00		2026-06-13 14:52:59.825889	2026-06-13 14:53:29.253723
47	49	0.00	100.00	0.00	0.00	3.00	35.00		2026-06-13 14:52:42.610928	2026-06-13 14:53:36.435365
13	14	0.00	100.00	0.00	0.00	3.00	35.00		2026-06-13 12:04:43.159536	2026-06-13 15:13:06.852835
37	39	0.00	100.00	0.00	0.00	3.00	35.00		2026-06-13 13:59:28.088709	2026-06-13 15:13:24.270096
60	63	0.00	100.00	0.00	0.00	3.00	35.00		2026-06-13 15:23:43.630395	2026-06-13 15:29:31.470486
59	62	0.00	100.00	0.00	0.00	3.00	35.00		2026-06-13 15:22:58.058765	2026-06-13 15:29:41.166873
58	61	0.00	100.00	0.00	0.00	3.00	35.00		2026-06-13 15:22:31.635737	2026-06-13 15:29:49.632232
73	76	0.00	100.00	0.00	0.00	3.00	35.00		2026-06-14 10:13:15.251043	2026-06-14 10:14:34.769999
69	72	0.00	100.00	0.00	0.00	3.00	35.00		2026-06-13 18:42:46.702563	2026-06-13 18:46:38.613843
70	73	0.00	100.00	0.00	0.00	3.00	35.00		2026-06-13 18:49:50.486772	2026-06-13 18:50:17.164576
71	74	0.00	100.00	0.00	0.00	3.00	35.00		2026-06-13 19:32:07.704858	2026-06-13 19:34:31.139335
72	75	0.00	100.00	0.00	0.00	3.00	35.00		2026-06-13 23:20:53.879648	2026-06-13 23:21:23.59925
75	78	0.00	100.00	0.00	0.00	3.00	35.00		2026-06-14 10:14:09.23033	2026-06-14 10:14:19.335575
74	77	0.00	100.00	0.00	0.00	3.00	35.00		2026-06-14 10:13:34.515767	2026-06-14 10:14:28.553773
76	79	0.00	0.00	0.00	0.00	3.00	35.00		2026-06-14 14:06:40.734854	2026-06-14 14:06:51.61519
31	32	0.00	100.00	0.00	0.00	3.00	35.00		2026-06-13 12:33:34.981254	2026-06-16 17:30:22.721425
22	23	0.00	100.00	0.00	0.00	3.00	35.00		2026-06-13 12:24:59.468826	2026-06-16 17:39:04.012912
30	31	0.00	100.00	0.00	0.00	3.00	35.00		2026-06-13 12:32:27.529963	2026-06-16 17:41:02.51626
77	80	20000.00	100.00	0.00	0.00	3.00	35.00		2026-06-15 12:32:37.753818	2026-06-16 17:45:23.124845
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
42	13	81	\N	600.000	Ml
43	40	81	\N	600.000	Ml
45	26	74	\N	320.000	Ml
46	25	78	\N	400.000	Ml
47	24	72	\N	498.000	Ml
49	35	89	\N	330.000	Ml
53	22	66	\N	390.000	Ml
54	21	68	\N	390.000	Ml
55	20	82	\N	390.000	Ml
56	19	70	\N	350.000	Ml
59	33	87	\N	310.000	Ml
60	36	90	\N	250.000	Ml
61	29	77	\N	320.000	Ml
62	27	76	\N	320.000	Ml
63	28	85	\N	320.000	Ml
68	38	100	\N	8.000	Pcs
69	41	102	\N	3.000	Pcs
70	42	103	\N	150.000	Gram
71	37	105	\N	4.000	Pcs
72	15	99	\N	330.000	Ml
75	43	106	\N	1.000	Pcs
76	48	109	\N	1.000	Pcs
77	47	107	\N	1.000	Pcs
78	46	110	\N	1.000	Pcs
79	44	108	\N	1.000	Pcs
80	45	111	\N	5.000	Pcs
81	51	114	\N	1.000	Pcs
82	50	113	\N	1.000	Pcs
83	49	112	\N	1.000	Pcs
84	14	133	\N	1.000	Pcs
85	39	128	\N	30.000	Gram
86	52	138	\N	1.000	Pcs
87	53	134	\N	1.000	Pcs
88	54	137	\N	1.000	Pcs
89	55	136	\N	1.000	Pcs
90	56	135	\N	1.000	Pcs
91	58	132	\N	30.000	Gram
92	59	131	\N	30.000	Gram
93	60	130	\N	30.000	Gram
94	71	115	\N	30.000	Gram
95	70	116	\N	29.000	Gram
96	69	117	\N	30.000	Gram
97	68	118	\N	30.000	Gram
98	66	122	\N	30.000	Gram
99	67	121	\N	30.000	Gram
100	65	123	\N	30.000	Gram
101	64	124	\N	30.000	Gram
102	63	125	\N	30.000	Gram
103	62	126	\N	30.000	Gram
104	61	127	\N	30.000	Gram
106	72	139	\N	30.000	Gram
107	73	140	\N	30.000	Gram
108	74	141	\N	1.000	Portion
109	75	104	\N	12.000	Pcs
110	78	147	\N	1.000	Pcs
111	77	146	\N	1.000	Pcs
112	76	145	\N	1.000	Pcs
113	79	148	\N	1.000	Pcs
114	32	152	\N	1.000	Pcs
115	23	153	\N	1.000	Pcs
116	31	79	\N	425.000	Ml
117	80	151	\N	1.000	Pcs
\.


--
-- Data for Name: roles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.roles (id, name, permissions, "approvalLevel", description) FROM stdin;
1	SUPERADMIN	["DASHBOARD_TABLE","ACCESS_KDS","ACCESS_BDS","BILLIARD_PRICING","PROMO_MANAGE","BUSINESS_DAY_VIEW","BUSINESS_DAY_CLOSE","SHIFT_START","WAITING_LIST_VIEW","WAITING_LIST_MANAGE","DASHBOARD_STATS_VIEW","DASHBOARD_CHART_VIEW","MEMBER_VIEW","MEMBER_MANAGE","MEMBER_TOPUP","CUSTOMER_FEEDBACK","BILLIARD_VIEW","BILLIARD_CARD_VIEW","BILLIARD_START","BILLIARD_EXTEND","BILLIARD_STOP","BILLIARD_PAY","BILLIARD_MOVE","BILLIARD_LIGHT","BILLIARD_ORDER","BILLIARD_CANCEL_ITEM","BILLIARD_PREVIEW","BILLIARD_SWITCH","BILLIARD_MANAGE_TABLES","ORDER_CREATE","ORDER_EDIT","ORDER_CANCEL","ORDER_DISCOUNT","ORDER_VOID","PAYMENT_PROCESS","PAYMENT_REFUND","CAFE_VIEW","CAFE_CARD_VIEW","CAFE_START","CAFE_ORDER","CAFE_PAY","CAFE_TRANSFER","CAFE_CANCEL_ITEM","POS_ORDER_CREATE","POS_PAYMENT","POS_SHIFT","INV_VIEW","INVENTORY_WASTE","INV_ADD_ITEM","INVENTORY_STOCK_IN","INVENTORY_STOCK_OUT","INVENTORY_RECEIVE","INV_EDIT_ITEM","INV_DELETE_ITEM","INV_RECIPE","INV_ADD_MENU","INV_EDIT_MENU","INV_DELETE_MENU","INV_TOGGLE_MENU","INV_ALERT","INVENTORY_STOCK_ADJUST","INVENTORY_SUPPLIER_MANAGE","STOCK_TRANSFER","STOCK_OPNAME","KDS_VIEW","KDS_PROCESS","KDS_SET_READY","KDS_HISTORY","BDS_VIEW","BDS_PROCESS","BDS_SET_READY","BDS_HISTORY","FIN_REVENUE","FIN_EXPENSES_VIEW","FIN_EXPENSES_ADD","FIN_LEDGER","FIN_PRINT_REPRINT","FIN_DEBTS","REPORT_EXPORT","AR_LIST_VIEW","AR_PAYMENT","AR_SETTLE","SHIFT_REPORT","USER_MANAGE","USER_EDIT","USER_DELETE","USER_VIOLATION","USER_ROLE","USER_MONITOR","USER_FORCE_LOGOUT","AUDIT_VIEW","AUDIT_EXPORT","PAYROLL_VIEW","SHIFT_MANAGE","APPROVAL_OVERRIDE","USER_ROLE_EDIT","APPROVAL_VIEW","APPROVAL_ACTION","SETTING_IDENTITY","SETTING_POLICY","SETTING_OPERATION","SETTING_APPROVAL","SETTING_HARDWARE","SETTING_FIRMWARE","SETTING_INVOICE","SETTING_DATABASE","SETTING_WHATSAPP","SETTING_LICENSE","SETTING_TABLES","TABLE_CREATE","TABLE_EDIT","TABLE_DELETE","PROMO_APPLY","SETTING_DISPLAY","SETTING_GAMIFICATION","SETTING_PREFERENCES","SYSTEM_CLEANUP","SYSTEM_BACKUP","WEBSOCKET_MONITOR","MQTT_MONITOR","IOT_CONTROL","IOT_MONITOR","ERROR_LOGS","DEBUG_TOOLS","EXPERIMENTAL_FEATURES","DATABASE_SYNC","API_KEYS_MANAGE","USER_SESSIONS","NOTIFICATION_MANAGE","VOUCHER_MANAGE","VOUCHER_REDEEM","START_TABLE","MOVE_TABLE","SWITCH_PACKAGE","SET_PRICE","VOID_BILLING","VIEW_MENU","ORDER_MENU","MANAGE_RETAIL","VOID_ORDER","VIEW_INVENTORY","UPDATE_INVENTORY","MANAGE_RECIPE","STOCK_ALERT","VIEW_REVENUE","VIEW_PROFIT_LOSS","MANAGE_EXPENSES","REPRINT_INVOICE","MANAGE_EMPLOYEES","MANAGE_PAYROLL","MONITOR_ACTIVITY","FORCE_LOGOUT","TABLE_CONTROL_PANEL","AI_ARME_GAMIFICATION","GAMIFICATION_ANALYTICS","SCAN_REDEMPTION","REWARDS_CATALOG","LOCKER_MANAGE"]	3	
2	KITCHEN	["ACCESS_KDS"]	0	Kitchen (KDS Only)
3	KASIR	["DASHBOARD_VIEW","DASHBOARD_TABLE","STOP_TABLE","CAFE_ORDER","CAFE_VIEW","BILLING_VIEW","PAYMENT_PROCESS","TABLE_MANAGE","WAITING_LIST_MANAGE","WAITING_LIST_VIEW","MEMBER_VIEW","MEMBER_MANAGE","MEMBER_TOPUP","CUSTOMER_FEEDBACK","BILLIARD_VIEW","BILLIARD_CARD_VIEW","BILLIARD_START","BILLIARD_EXTEND","BILLIARD_STOP","BILLIARD_PAY","BILLIARD_MOVE","BILLIARD_LIGHT","BILLIARD_ORDER","BILLIARD_CANCEL_ITEM","BILLIARD_PREVIEW","BILLIARD_SWITCH","BILLIARD_MANAGE_TABLES","CAFE_CARD_VIEW","CAFE_START","CAFE_PAY","CAFE_TRANSFER","CAFE_CANCEL_ITEM","POS_ORDER_CREATE","POS_PAYMENT","POS_SHIFT","ORDER_CREATE","ORDER_EDIT","ORDER_CANCEL","ORDER_DISCOUNT","ORDER_VOID","PAYMENT_REFUND","ACCESS_KDS","ACCESS_BDS","KDS_VIEW","KDS_PROCESS","KDS_SET_READY","KDS_HISTORY","BDS_VIEW","BDS_PROCESS","BDS_SET_READY","BDS_HISTORY","INV_VIEW","INVENTORY_WASTE","INV_ADD_ITEM","INVENTORY_STOCK_IN","INVENTORY_STOCK_OUT","INVENTORY_RECEIVE","INV_EDIT_ITEM","INV_DELETE_ITEM","INV_RECIPE","INV_ADD_MENU","INV_EDIT_MENU","INV_DELETE_MENU","INV_TOGGLE_MENU","INV_ALERT","INVENTORY_STOCK_ADJUST","INVENTORY_SUPPLIER_MANAGE","STOCK_TRANSFER","STOCK_OPNAME","FIN_EXPENSES_ADD","FIN_EXPENSES_VIEW","FIN_PRINT_REPRINT","FIN_DEBTS","BUSINESS_DAY_VIEW","BUSINESS_DAY_CLOSE","AR_LIST_VIEW","AR_PAYMENT","AR_SETTLE","SHIFT_START","APPROVAL_VIEW","APPROVAL_ACTION","FIN_LEDGER","START_TABLE","MOVE_TABLE","SWITCH_PACKAGE","VOID_BILLING","VIEW_MENU","ORDER_MENU","MANAGE_RETAIL","VOID_ORDER","REPRINT_INVOICE","VOUCHER_MANAGE","VOUCHER_REDEEM","TABLE_CONTROL_PANEL"]	1	Kasir (Full Billiard & Cafe)
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
38	\N	prepaid	2026-06-13 10:21:06.997	2026-06-13 11:21:07.061	60	0.00	f	2026-06-13 11:21:07.062424	2026-06-13 11:21:07.062424	2
39	\N	prepaid	2026-06-13 11:02:42.571	2026-06-13 14:02:42.638	180	0.00	f	2026-06-13 14:02:42.640498	2026-06-13 14:02:42.640498	1
40	\N	prepaid	2026-06-13 13:58:01.012	2026-06-13 15:58:01.237	120	0.00	f	2026-06-13 15:58:01.238949	2026-06-13 15:58:01.238949	5
41	\N	prepaid	2026-06-13 18:21:18.787	2026-06-13 19:21:18.854	60	0.00	f	2026-06-13 19:21:18.856309	2026-06-13 19:21:18.856309	4
42	\N	prepaid	2026-06-13 18:05:09.091	2026-06-13 20:05:09.377	120	0.00	f	2026-06-13 20:05:09.377884	2026-06-13 20:05:09.377884	8
43	\N	prepaid	2026-06-13 19:46:20.417	2026-06-13 21:46:21.346	120	0.00	f	2026-06-13 21:46:21.348328	2026-06-13 21:46:21.348328	5
44	\N	prepaid	2026-06-13 20:00:46.166	2026-06-13 22:00:46.36	120	0.00	f	2026-06-13 22:00:46.362917	2026-06-13 22:00:46.362917	4
45	\N	prepaid	2026-06-13 19:09:04.848	2026-06-13 22:09:04.952	180	0.00	f	2026-06-13 22:09:04.953686	2026-06-13 22:09:04.953686	1
46	\N	prepaid	2026-06-13 20:25:50.387	2026-06-13 22:25:50.532	120	0.00	f	2026-06-13 22:25:50.534186	2026-06-13 22:25:50.534186	6
47	\N	prepaid	2026-06-13 19:30:03.035	2026-06-13 22:30:03.533	180	0.00	f	2026-06-13 22:30:03.533867	2026-06-13 22:30:03.533867	12
48	\N	open	2026-06-13 19:33:51.72	2026-06-13 22:30:57.321	177	0.00	f	2026-06-13 22:30:57.322782	2026-06-13 22:30:57.322782	2
49	\N	open	2026-06-13 21:38:46.028	2026-06-13 22:32:04.285	53	0.00	f	2026-06-13 22:32:04.287067	2026-06-13 22:32:04.287067	9
50	\N	prepaid	2026-06-13 21:08:21.532	2026-06-13 23:08:21.612	120	0.00	f	2026-06-13 23:08:21.613506	2026-06-13 23:08:21.613506	8
51	\N	open	2026-06-13 21:44:27.58	2026-06-13 23:35:51.764	111	0.00	f	2026-06-13 23:35:51.766024	2026-06-13 23:35:51.766024	10
52	\N	prepaid	2026-06-13 22:44:18.312	2026-06-13 23:44:18.537	60	0.00	f	2026-06-13 23:44:18.539724	2026-06-13 23:44:18.539724	9
53	\N	prepaid	2026-06-13 21:55:37.982	2026-06-13 23:55:38.481	120	0.00	f	2026-06-13 23:55:38.483567	2026-06-13 23:55:38.483567	5
54	\N	open	2026-06-13 21:16:21.016	2026-06-14 00:05:22.102	169	0.00	f	2026-06-14 00:05:22.103302	2026-06-14 00:05:22.103302	7
55	\N	prepaid	2026-06-13 23:12:03.209	2026-06-14 00:12:03.352	60	0.00	f	2026-06-14 00:12:03.353756	2026-06-14 00:12:03.353756	8
56	\N	open	2026-06-13 20:50:44.41	2026-06-14 00:15:57.265	205	0.00	f	2026-06-14 00:15:57.266516	2026-06-14 00:15:57.266516	2
57	\N	prepaid	2026-06-13 22:29:12.358	2026-06-14 00:29:12.654	120	0.00	f	2026-06-14 00:29:12.655952	2026-06-14 00:29:12.655952	6
58	\N	prepaid	2026-06-13 22:04:39.412	2026-06-14 01:04:39.583	180	0.00	f	2026-06-14 01:04:39.58453	2026-06-14 01:04:39.58453	4
59	\N	open	2026-06-13 22:53:23.23	2026-06-14 01:07:47.321	134	0.00	f	2026-06-14 01:07:47.322874	2026-06-14 01:07:47.322874	11
60	\N	prepaid	2026-06-13 22:11:36.916	2026-06-14 01:11:37.022	180	0.00	f	2026-06-14 01:11:37.025738	2026-06-14 01:11:37.025738	1
61	\N	open	2026-06-14 01:31:50.294	2026-06-14 02:18:46.437	47	0.00	f	2026-06-14 02:18:46.439392	2026-06-14 02:18:46.439392	2
62	\N	open	2026-06-14 00:03:01.642	2026-06-14 02:21:50.884	139	0.00	f	2026-06-14 02:21:50.886315	2026-06-14 02:21:50.886315	5
63	\N	open	2026-06-14 01:13:13.943	2026-06-14 02:37:22.223	84	0.00	f	2026-06-14 02:37:22.224625	2026-06-14 02:37:22.224625	1
64	\N	open	2026-06-13 22:37:53.227	2026-06-14 02:56:34.95	259	0.00	f	2026-06-14 02:56:34.95297	2026-06-14 02:56:34.95297	3
65	\N	open	2026-06-14 00:42:53.573	2026-06-14 03:07:55.408	145	0.00	f	2026-06-14 03:07:55.408571	2026-06-14 03:07:55.408571	7
66	\N	prepaid	2026-06-14 02:31:09.268	2026-06-14 03:31:09.366	60	0.00	f	2026-06-14 03:31:09.367934	2026-06-14 03:31:09.367934	2
67	\N	open	2026-06-14 01:43:55.302	2026-06-14 04:31:10.651	167	0.00	f	2026-06-14 04:31:10.653043	2026-06-14 04:31:10.653043	5
68	\N	prepaid	2026-06-14 10:11:11.186	2026-06-14 11:11:11.281	60	0.00	f	2026-06-14 11:11:11.282639	2026-06-14 11:11:11.282639	5
69	\N	prepaid	2026-06-14 10:30:58.959	2026-06-14 11:30:59.028	60	0.00	f	2026-06-14 11:30:59.02924	2026-06-14 11:30:59.02924	2
70	\N	prepaid	2026-06-14 11:51:26.064	2026-06-14 12:51:26.205	60	0.00	f	2026-06-14 12:51:26.206083	2026-06-14 12:51:26.206083	2
71	\N	prepaid	2026-06-14 12:51:05.314	2026-06-14 13:51:05.649	60	0.00	f	2026-06-14 13:51:05.652257	2026-06-14 13:51:05.652257	5
72	\N	prepaid	2026-06-14 13:22:04.298	2026-06-14 15:22:04.402	120	0.00	f	2026-06-14 15:22:04.40438	2026-06-14 15:22:04.40438	2
73	\N	prepaid	2026-06-14 15:05:47.955	2026-06-14 16:05:48.057	60	0.00	f	2026-06-14 16:05:48.060234	2026-06-14 16:05:48.060234	8
74	\N	open	2026-06-14 14:15:57.066	2026-06-14 16:27:56.162	132	0.00	f	2026-06-14 16:27:56.162778	2026-06-14 16:27:56.162778	4
75	\N	prepaid	2026-06-14 14:02:34.217	2026-06-14 17:02:34.441	180	0.00	f	2026-06-14 17:02:34.443734	2026-06-14 17:02:34.443734	5
76	\N	prepaid	2026-06-14 14:42:17.011	2026-06-14 17:42:17.754	180	0.00	f	2026-06-14 17:42:17.756278	2026-06-14 17:42:17.756278	6
77	\N	open	2026-06-14 11:55:49.685	2026-06-14 18:03:49.502	368	0.00	f	2026-06-14 18:03:49.50348	2026-06-14 18:03:49.50348	1
78	\N	prepaid	2026-06-14 16:11:38.627	2026-06-14 18:11:38.7	120	0.00	f	2026-06-14 18:11:38.703535	2026-06-14 18:11:38.703535	2
79	\N	prepaid	2026-06-14 15:31:58.963	2026-06-14 18:31:59.074	180	0.00	f	2026-06-14 18:31:59.075177	2026-06-14 18:31:59.075177	9
80	\N	prepaid	2026-06-14 18:34:54.088	2026-06-14 19:34:54.533	60	0.00	f	2026-06-14 19:34:54.536943	2026-06-14 19:34:54.536943	9
81	\N	prepaid	2026-06-14 18:19:46.444	2026-06-14 19:56:38.683	97	0.00	f	2026-06-14 19:56:38.685074	2026-06-14 19:56:38.685074	2
82	\N	prepaid	2026-06-14 18:37:30.692	2026-06-14 20:37:30.772	120	0.00	f	2026-06-14 20:37:30.773995	2026-06-14 20:37:30.773995	10
83	\N	prepaid	2026-06-14 18:43:38.397	2026-06-14 20:43:39.199	120	0.00	f	2026-06-14 20:43:39.201645	2026-06-14 20:43:39.201645	4
84	\N	prepaid	2026-06-14 19:00:02.113	2026-06-14 21:00:02.813	120	0.00	f	2026-06-14 21:00:02.814968	2026-06-14 21:00:02.814968	5
85	\N	prepaid	2026-06-14 19:18:45.687	2026-06-14 21:18:45.788	120	0.00	f	2026-06-14 21:18:45.790656	2026-06-14 21:18:45.790656	3
86	\N	prepaid	2026-06-14 18:26:23.693	2026-06-14 21:26:23.775	180	0.00	f	2026-06-14 21:26:23.776975	2026-06-14 21:26:23.776975	6
87	\N	open	2026-06-14 20:01:04.263	2026-06-14 21:32:47.288	92	0.00	f	2026-06-14 21:32:47.289218	2026-06-14 21:32:47.289218	2
88	\N	prepaid	2026-06-14 18:41:02.364	2026-06-14 21:41:02.761	180	0.00	f	2026-06-14 21:41:02.763224	2026-06-14 21:41:02.763224	1
89	\N	prepaid	2026-06-14 19:25:57.727	2026-06-14 22:25:57.793	180	0.00	f	2026-06-14 22:25:57.794486	2026-06-14 22:25:57.794486	7
90	\N	prepaid	2026-06-14 20:40:46.303	2026-06-14 22:40:46.65	120	0.00	f	2026-06-14 22:40:46.651814	2026-06-14 22:40:46.651814	8
91	\N	prepaid	2026-06-14 20:45:29.035	2026-06-14 22:45:29.345	120	0.00	f	2026-06-14 22:45:29.34606	2026-06-14 22:45:29.34606	4
92	\N	open	2026-06-14 22:00:37	2026-06-14 23:00:13.249	60	0.00	f	2026-06-14 23:00:13.250756	2026-06-14 23:00:13.250756	12
93	\N	prepaid	2026-06-14 22:01:43.559	2026-06-14 23:01:43.957	60	0.00	f	2026-06-14 23:01:43.957869	2026-06-14 23:01:43.957869	3
94	\N	prepaid	2026-06-14 23:02:02.6	2026-06-15 00:02:02.809	60	0.00	f	2026-06-15 00:02:02.81084	2026-06-15 00:02:02.81084	12
95	\N	prepaid	2026-06-14 21:02:14.025	2026-06-15 00:02:14.207	180	0.00	f	2026-06-15 00:02:14.208251	2026-06-15 00:02:14.208251	5
96	\N	open	2026-06-14 22:00:19.167	2026-06-15 00:26:25.562	146	0.00	f	2026-06-15 00:26:25.563374	2026-06-15 00:26:25.563374	2
97	\N	prepaid	2026-06-14 22:36:49.573	2026-06-15 00:36:49.638	120	0.00	f	2026-06-15 00:36:49.640291	2026-06-15 00:36:49.640291	7
98	\N	prepaid	2026-06-14 23:05:15.9	2026-06-15 00:46:55.99	102	0.00	f	2026-06-15 00:46:55.991461	2026-06-15 00:46:55.991461	4
99	\N	prepaid	2026-06-15 00:19:12.485	2026-06-15 01:19:12.727	60	0.00	f	2026-06-15 01:19:12.729915	2026-06-15 01:19:12.729915	3
100	\N	prepaid	2026-06-14 23:37:17.569	2026-06-15 01:37:17.624	120	0.00	f	2026-06-15 01:37:17.624974	2026-06-15 01:37:17.624974	10
101	\N	prepaid	2026-06-15 00:19:46.678	2026-06-15 02:19:46.727	120	0.00	f	2026-06-15 02:19:46.728274	2026-06-15 02:19:46.728274	11
102	\N	prepaid	2026-06-15 00:49:05.546	2026-06-15 02:38:24.818	109	0.00	f	2026-06-15 02:38:24.820751	2026-06-15 02:38:24.820751	4
103	\N	prepaid	2026-06-15 01:13:44.695	2026-06-15 04:10:28.048	177	0.00	f	2026-06-15 04:10:28.049992	2026-06-15 04:10:28.049992	1
104	\N	prepaid	2026-06-15 10:10:30.906	2026-06-15 12:10:31.167	120	0.00	f	2026-06-15 12:10:31.168039	2026-06-15 12:10:31.168039	4
105	\N	prepaid	2026-06-15 10:19:17.458	2026-06-15 12:19:17.675	120	0.00	f	2026-06-15 12:19:17.676381	2026-06-15 12:19:17.676381	2
106	\N	prepaid	2026-06-15 11:32:19.277	2026-06-15 12:32:19.386	60	0.00	f	2026-06-15 12:32:19.387012	2026-06-15 12:32:19.387012	3
107	\N	prepaid	2026-06-15 11:23:50.036	2026-06-15 14:23:50.096	180	0.00	f	2026-06-15 14:23:50.097362	2026-06-15 14:23:50.097362	1
108	\N	prepaid	2026-06-15 12:27:55.435	2026-06-15 14:27:55.697	120	0.00	f	2026-06-15 14:27:55.698121	2026-06-15 14:27:55.698121	2
109	\N	prepaid	2026-06-15 12:43:51.941	2026-06-15 14:43:52.307	120	0.00	f	2026-06-15 14:43:52.308353	2026-06-15 14:43:52.308353	3
110	\N	prepaid	2026-06-15 13:18:53.025	2026-06-15 16:18:53.198	180	0.00	f	2026-06-15 16:18:53.199326	2026-06-15 16:18:53.199326	4
111	\N	prepaid	2026-06-15 13:49:15.529	2026-06-15 16:49:15.819	180	0.00	f	2026-06-15 16:49:15.819877	2026-06-15 16:49:15.819877	5
112	\N	prepaid	2026-06-15 14:50:22.592	2026-06-15 16:50:22.894	120	0.00	f	2026-06-15 16:50:22.895233	2026-06-15 16:50:22.895233	2
113	\N	prepaid	2026-06-15 13:18:53.025	2026-06-15 17:19:56.812	241	0.00	f	2026-06-15 17:19:56.814108	2026-06-15 17:19:56.814108	4
114	\N	prepaid	2026-06-15 16:04:53.439	2026-06-15 18:04:53.648	120	0.00	f	2026-06-15 18:04:53.648723	2026-06-15 18:04:53.648723	6
115	\N	prepaid	2026-06-15 19:31:26.469	2026-06-15 20:31:26.551	60	0.00	f	2026-06-15 20:31:26.551691	2026-06-15 20:31:26.551691	4
116	\N	prepaid	2026-06-15 18:36:14.343	2026-06-15 20:36:14.569	120	0.00	f	2026-06-15 20:36:14.571531	2026-06-15 20:36:14.571531	3
117	\N	prepaid	2026-06-15 19:04:43.419	2026-06-15 21:04:43.655	120	0.00	f	2026-06-15 21:04:43.661654	2026-06-15 21:04:43.661654	7
118	\N	prepaid	2026-06-15 19:12:35.25	2026-06-15 21:12:35.407	120	0.00	f	2026-06-15 21:12:35.410376	2026-06-15 21:12:35.410376	1
119	\N	prepaid	2026-06-15 19:39:40.258	2026-06-15 21:39:40.444	120	0.00	f	2026-06-15 21:39:40.445453	2026-06-15 21:39:40.445453	8
120	\N	open	2026-06-15 19:46:09.943	2026-06-15 22:20:14.053	154	0.00	f	2026-06-15 22:20:14.054929	2026-06-15 22:20:14.054929	6
121	\N	prepaid	2026-06-15 20:23:37.434	2026-06-15 23:23:37.6	180	0.00	f	2026-06-15 23:23:37.600981	2026-06-15 23:23:37.600981	5
122	\N	prepaid	2026-06-15 21:28:13.964	2026-06-15 23:28:14.138	120	0.00	f	2026-06-15 23:28:14.140038	2026-06-15 23:28:14.140038	7
123	\N	open	2026-06-15 20:58:33.509	2026-06-15 23:33:44.123	155	0.00	f	2026-06-15 23:33:44.124556	2026-06-15 23:33:44.124556	3
124	\N	prepaid	2026-06-15 21:40:53.543	2026-06-15 23:40:53.597	120	0.00	f	2026-06-15 23:40:53.598069	2026-06-15 23:40:53.598069	12
125	\N	prepaid	2026-06-15 20:45:08.612	2026-06-15 23:45:09.437	180	0.00	f	2026-06-15 23:45:09.438498	2026-06-15 23:45:09.438498	4
126	\N	open	2026-06-15 19:44:05.304	2026-06-16 00:09:55.121	266	0.00	f	2026-06-16 00:09:55.123563	2026-06-16 00:09:55.123563	1
127	\N	open	2026-06-15 21:52:30.188	2026-06-16 00:22:46.644	150	0.00	f	2026-06-16 00:22:46.644841	2026-06-16 00:22:46.644841	8
128	\N	prepaid	2026-06-15 21:24:00.837	2026-06-16 00:24:01.007	180	0.00	f	2026-06-16 00:24:01.008366	2026-06-16 00:24:01.008366	2
129	\N	prepaid	2026-06-15 23:34:48.052	2026-06-16 01:34:48.168	120	0.00	f	2026-06-16 01:34:48.170999	2026-06-16 01:34:48.170999	3
130	\N	prepaid	2026-06-15 23:49:01.384	2026-06-16 01:49:01.83	120	0.00	f	2026-06-16 01:49:01.832564	2026-06-16 01:49:01.832564	5
131	\N	prepaid	2026-06-16 10:11:25.061	2026-06-16 12:11:25.172	120	0.00	f	2026-06-16 12:11:25.173922	2026-06-16 12:11:25.173922	2
132	\N	prepaid	2026-06-16 11:43:53.129	2026-06-16 13:43:53.478	120	0.00	f	2026-06-16 13:43:53.482669	2026-06-16 13:43:53.482669	1
133	\N	prepaid	2026-06-16 10:55:08.704	2026-06-16 13:55:08.984	180	0.00	f	2026-06-16 13:55:08.992512	2026-06-16 13:55:08.992512	9
134	\N	prepaid	2026-06-16 11:04:03.047	2026-06-16 14:04:03.149	180	0.00	f	2026-06-16 14:04:03.151845	2026-06-16 14:04:03.151845	11
135	\N	prepaid	2026-06-16 11:39:05.41	2026-06-16 14:39:05.497	180	0.00	f	2026-06-16 14:39:05.505111	2026-06-16 14:39:05.505111	3
136	\N	prepaid	2026-06-16 10:55:08.704	2026-06-16 14:56:42.768	242	0.00	f	2026-06-16 14:56:42.771384	2026-06-16 14:56:42.771384	9
137	\N	prepaid	2026-06-16 11:39:05.41	2026-06-16 15:39:28.668	240	0.00	f	2026-06-16 15:39:28.671459	2026-06-16 15:39:28.671459	3
138	\N	prepaid	2026-06-16 12:59:34.049	2026-06-16 15:59:34.399	180	0.00	f	2026-06-16 15:59:34.400707	2026-06-16 15:59:34.400707	8
139	\N	open	2026-06-16 15:48:04.986	2026-06-16 17:51:08.024	123	0.00	f	2026-06-16 17:51:08.026022	2026-06-16 17:51:08.026022	4
140	\N	prepaid	2026-06-16 15:13:29.626	2026-06-16 18:13:29.785	180	0.00	f	2026-06-16 18:13:29.78673	2026-06-16 18:13:29.78673	1
141	\N	prepaid	2026-06-16 15:23:11.942	2026-06-16 18:23:12.179	180	0.00	f	2026-06-16 18:23:12.181265	2026-06-16 18:23:12.181265	2
142	\N	prepaid	2026-06-16 19:21:31.207	2026-06-16 20:21:31.341	60	0.00	f	2026-06-16 20:21:31.343253	2026-06-16 20:21:31.343253	1
143	\N	prepaid	2026-06-16 18:53:20.726	2026-06-16 20:53:21.534	120	0.00	f	2026-06-16 20:53:21.535262	2026-06-16 20:53:21.535262	2
144	\N	prepaid	2026-06-16 19:22:38.358	2026-06-16 21:18:52.585	116	0.00	f	2026-06-16 21:18:52.586997	2026-06-16 21:18:52.586997	7
145	\N	prepaid	2026-06-16 19:33:27.109	2026-06-16 21:33:27.184	120	0.00	f	2026-06-16 21:33:27.186004	2026-06-16 21:33:27.186004	3
146	\N	prepaid	2026-06-16 18:56:07.588	2026-06-16 21:56:08.023	180	0.00	f	2026-06-16 21:56:08.0258	2026-06-16 21:56:08.0258	6
147	\N	prepaid	2026-06-16 21:05:53.484	2026-06-16 22:05:53.722	60	0.00	f	2026-06-16 22:05:53.723949	2026-06-16 22:05:53.723949	8
148	\N	prepaid	2026-06-16 20:28:57.625	2026-06-16 22:28:57.806	120	0.00	f	2026-06-16 22:28:57.807839	2026-06-16 22:28:57.807839	1
149	\N	prepaid	2026-06-16 20:33:30.21	2026-06-16 22:33:30.632	120	0.00	f	2026-06-16 22:33:30.633844	2026-06-16 22:33:30.633844	5
150	\N	prepaid	2026-06-16 22:04:15.77	2026-06-16 23:01:55.006	58	0.00	f	2026-06-16 23:01:55.007856	2026-06-16 23:01:55.007856	3
151	\N	open	2026-06-16 19:35:19.496	2026-06-16 23:51:09.678	256	0.00	f	2026-06-16 23:51:09.679961	2026-06-16 23:51:09.679961	4
152	\N	prepaid	2026-06-16 22:23:40.328	2026-06-17 00:23:40.425	120	0.00	f	2026-06-17 00:23:40.427077	2026-06-17 00:23:40.427077	6
153	\N	open	2026-06-16 21:14:08.714	2026-06-17 00:28:11.357	194	0.00	f	2026-06-17 00:28:11.358975	2026-06-17 00:28:11.358975	2
154	\N	prepaid	2026-06-16 23:35:09.94	2026-06-17 01:35:10.341	120	0.00	f	2026-06-17 01:35:10.342468	2026-06-17 01:35:10.342468	5
\.


--
-- Data for Name: settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.settings (id, "businessName", address, contact, "socialMediaLink", "logoPath", "ppnPercentage", "serviceChargePercentage", "roundingKelipatan", "businessDayOffset", "autoMaintenanceTime", "availablePaymentMethods", "mqttBrokerAddress", "tftWallpaper", "invoiceBusinessName", "invoiceAddress", "invoiceContact", "invoiceSocialMedia", "invoiceFooterNote", "customPricingDynamic", "availableShifts", "shiftEndingWarningMinutes", "endingSoonThreshold", "balanceBuffer", "balanceWarningMinutes", "royaltyPointsPerAmount", "royaltyPointRedeemValue", "scratchBombWinRate", "scratchBombRewards", "scratchBombAvgWinPts", "gamificationAutoPilot", "gamificationTargetSurplus", "scratchBombPlayCost", "pointExpiryDays", "scratchBombPool", "mahjongSlotWinRate", "mahjongSlotPool", "isEmergencyMode", "printerWidth", "displayPromotions", "ownerPhone", "autoReportEnabled", "reportSchedule", "waTemplateWelcome", "aiStaffingRatio", "aiAutoPromote", "aiAutoPromoteThreshold", "waTemplateSessionEnd", "autoSettlementEnabled", "autoSettlementTime", "approvalConfig", "bounceBackConfig", "isIotBypassed", "enableAISalesOrchestrator", "enableBounceBack") FROM stdin;
1	SCUFF BILLIARD	 Tulangan Tengah, Tulangan, Kec. Tulangan, Kabupaten Sidoarjo	0851-1770-5709	@scuffbilliard	/uploads/logos/logo-1781206637608-970143562.jpeg	0.00	0.00	100	04:00	03:00	["CASH","Qris","TRANSFER","GoPay","DANA","OVO","BCA","MANDIRI","BRI","BNI","SEABANK","SHOPEEPAY"]	127.0.0.1	\N	\N	\N	\N	\N	Periksa kembali nota anda, kami tidak menerima komplain \nsaat anda meninggalkan area ini.	[{"categoryId":1,"basePrice":0,"timeSlots":[{"start":"10:00","end":"18:00","price":35000},{"start":"18:00","end":"02:00","price":"45000"},{"start":"02:00","end":"10:00","price":"45000"}]},{"categoryId":2,"basePrice":0,"timeSlots":[{"start":"10:00","end":"18:00","price":"25000"},{"start":"18:00","end":"02:00","price":"35000"},{"start":"02:00","end":"10:00","price":"35000"}]},{"categoryId":3,"basePrice":0,"timeSlots":[{"start":"10:00","end":"17:00","price":"20000"},{"start":"17:00","end":"02:00","price":"30000"},{"start":"02:00","end":"10:00","price":"30000"}]}]	[{"name":"SHIFT 1","startTime":"10:00","endTime":"18:00"},{"name":"SHIFT 2","startTime":"18:00","endTime":"02:00"},{"name":"OVERTIME","startTime":"02:00","endTime":"10:00"}]	10	5	2000	15	1000	200	5	1,2,5,10,20,50,100	25	f	5000000	2	90	0	15	0	f	80	\N	\N	f	23:55	\N	5	t	0.80	\N	t	04:00	{"WASTE":[1,2],"EXPENSE":[1,2],"STOCK_UPDATE":[1,2],"PENALTY":[1,2],"CLOSING":[1,2],"DATA_EDIT":[1,2]}	[{"tierName":"Tier 1 - Pelanggan Reguler","minAmount":5000000,"maxAmount":100000,"rewardType":"FREE_ITEM","rewardValue":1,"minClaimTransaction":0,"expiryDays":7},{"tierName":"Tier 2 - Pelanggan Setia","minAmount":10000000,"maxAmount":250000,"rewardType":"DISCOUNT_FIXED","rewardValue":15000,"minClaimTransaction":50000,"expiryDays":14},{"tierName":"Tier 3 - Pelanggan VIP","minAmount":20000000,"maxAmount":99999999,"rewardType":"FREE_BILLIARD_MINUTES","rewardValue":60,"minClaimTransaction":0,"expiryDays":30}]	f	f	f
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
3	3	2	2026-06-13 09:35:48.433	SHIFT 1	2026-06-13 18:00:49.116	500000.00	636000.00	136000.00	-500000.00	0.00	Shift closed	CLOSED	Kasir 1	Kasir 1	PENDING	f	0	0	[{"type":"BILLIARD","id":1},{"type":"BILLIARD","id":2},{"type":"BILLIARD","id":3},{"type":"BILLIARD","id":4},{"type":"BILLIARD","id":5},{"type":"BILLIARD","id":6},{"type":"BILLIARD","id":7},{"type":"BILLIARD","id":8},{"type":"BILLIARD","id":9},{"type":"BILLIARD","id":10},{"type":"BILLIARD","id":11},{"type":"BILLIARD","id":12},{"type":"CAFE","id":1},{"type":"CAFE","id":2},{"type":"CAFE","id":3},{"type":"CAFE","id":4},{"type":"CAFE","id":5},{"type":"CAFE","id":6},{"type":"CAFE","id":7},{"type":"CAFE","id":8},{"type":"CAFE","id":9},{"type":"CAFE","id":10},{"type":"CAFE","id":11},{"type":"CAFE","id":12}]	136000.00	0.00	0.00		{"totalTransactions":3,"topWaiters":[{"name":"Kasir 1","count":3}],"topPackages":[{"name":"1 JAM WEEKEND","count":3},{"name":"3 JAM WEEKEND","count":1}],"topPromos":[],"topItems":[{"name":"Item","count":1},{"name":"KOPI GULA AREN","count":1}],"billiardRevenue":115000,"cafeRevenue":0,"topupRevenue":0}	\N	2026-06-13 09:35:48.434505
4	4	2	2026-06-13 18:01:00.614	SHIFT 2	2026-06-14 04:32:26.153	500000.00	2098900.00	2098900.00	0.00	0.00	Shift closed	CLOSED	Kasir 2	Kasir 2	PENDING	f	1	152	[{"type":"BILLIARD","id":1},{"type":"BILLIARD","id":2},{"type":"BILLIARD","id":3},{"type":"BILLIARD","id":4},{"type":"BILLIARD","id":5},{"type":"BILLIARD","id":6},{"type":"BILLIARD","id":7},{"type":"BILLIARD","id":8},{"type":"BILLIARD","id":9},{"type":"BILLIARD","id":10},{"type":"BILLIARD","id":11},{"type":"BILLIARD","id":12},{"type":"CAFE","id":1},{"type":"CAFE","id":2},{"type":"CAFE","id":3},{"type":"CAFE","id":4},{"type":"CAFE","id":5},{"type":"CAFE","id":6},{"type":"CAFE","id":7},{"type":"CAFE","id":8},{"type":"CAFE","id":9},{"type":"CAFE","id":10},{"type":"CAFE","id":11},{"type":"CAFE","id":12}]	1598900.00	973300.00	0.00		{"totalTransactions":27,"topWaiters":[{"name":"Kasir 2","count":27}],"topPackages":[{"name":"OPEN TABLE WEEKEND","count":22},{"name":"1 JAM WEEKEND","count":18},{"name":"3 JAM WEEKEND","count":4}],"topPromos":[],"topItems":[{"name":"AIR MINERAL","count":19},{"name":"KOPI GULA AREN","count":5},{"name":"KOPI SUSU","count":3},{"name":"ICE TEA","count":3},{"name":"KOPI HITAM","count":3},{"name":"BUBLE GUM/PERMEN KARET","count":2},{"name":"TARO","count":2},{"name":"LEMON TEA","count":2},{"name":"CAPPUCINNO","count":2},{"name":"NUGGET","count":2}],"billiardRevenue":1837083,"cafeRevenue":0,"topupRevenue":0}	\N	2026-06-13 18:01:00.615169
5	3	3	2026-06-14 09:59:51.505	SHIFT 1	2026-06-14 17:11:58.886	500000.00	798000.00	298000.00	-500000.00	0.00	Shift closed	CLOSED	Kasir 1	Kasir 1	PENDING	f	0	0	[{"type":"BILLIARD","id":1},{"type":"BILLIARD","id":2},{"type":"BILLIARD","id":3},{"type":"BILLIARD","id":4},{"type":"BILLIARD","id":5},{"type":"BILLIARD","id":6},{"type":"BILLIARD","id":7},{"type":"BILLIARD","id":8},{"type":"BILLIARD","id":9},{"type":"BILLIARD","id":10},{"type":"BILLIARD","id":11},{"type":"BILLIARD","id":12},{"type":"CAFE","id":1},{"type":"CAFE","id":2},{"type":"CAFE","id":3},{"type":"CAFE","id":4},{"type":"CAFE","id":5},{"type":"CAFE","id":6},{"type":"CAFE","id":7},{"type":"CAFE","id":8},{"type":"CAFE","id":9},{"type":"CAFE","id":10},{"type":"CAFE","id":11},{"type":"CAFE","id":12}]	298000.00	20000.00	0.00		{"totalTransactions":12,"topWaiters":[{"name":"Kasir 1","count":12}],"topPackages":[{"name":"1 JAM WEEKEND","count":15},{"name":"OPEN TABLE WEEKEND","count":2},{"name":"3 JAM WEEKEND","count":1}],"topPromos":[],"topItems":[{"name":"AIR MINERAL","count":5},{"name":"ICE TEA (FREE)","count":3},{"name":"TARO","count":2},{"name":"HOT AMERICANO","count":2},{"name":"HOT TEA","count":1},{"name":"KOPI HITAM","count":1},{"name":"LEMON TEA","count":1},{"name":"ICE TEA","count":1},{"name":"COCA COLA","count":1},{"name":"WATER LEMON SPRITE","count":1}],"billiardRevenue":444000,"cafeRevenue":0,"topupRevenue":0}	\N	2026-06-14 09:59:51.506622
6	4	3	2026-06-14 17:12:36.825	SHIFT 2	2026-06-15 04:20:20.544	500000.00	2217500.00	2217500.00	0.00	0.00	Shift closed	CLOSED	Kasir 2	Kasir 2	PENDING	f	0	140	[{"type":"BILLIARD","id":1},{"type":"BILLIARD","id":2},{"type":"BILLIARD","id":3},{"type":"BILLIARD","id":4},{"type":"BILLIARD","id":5},{"type":"BILLIARD","id":6},{"type":"BILLIARD","id":7},{"type":"BILLIARD","id":8},{"type":"BILLIARD","id":9},{"type":"BILLIARD","id":10},{"type":"BILLIARD","id":11},{"type":"BILLIARD","id":12},{"type":"CAFE","id":1},{"type":"CAFE","id":2},{"type":"CAFE","id":3},{"type":"CAFE","id":4},{"type":"CAFE","id":5},{"type":"CAFE","id":6},{"type":"CAFE","id":7},{"type":"CAFE","id":8},{"type":"CAFE","id":9},{"type":"CAFE","id":10},{"type":"CAFE","id":11},{"type":"CAFE","id":12}]	1717500.00	388000.00	0.00		{"totalTransactions":25,"topWaiters":[{"name":"Kasir 2","count":25}],"topPackages":[{"name":"1 JAM WEEKEND","count":22},{"name":"Custom Session","count":5},{"name":"OPEN TABLE WEEKEND","count":4},{"name":"3 JAM WEEKEND","count":4},{"name":"1 JAM WEEKEND ","count":1}],"topPromos":[],"topItems":[{"name":"AIR MINERAL","count":10},{"name":"ICE TEA","count":7},{"name":"LYCHEE TEA","count":5},{"name":"ICE TEA (FREE)","count":4},{"name":"KOPI SUSU","count":3},{"name":"RED VELVET","count":2},{"name":"NUGGET","count":1},{"name":"CINCAU CAP PANDA","count":1},{"name":"AMERICANO ICE","count":1},{"name":"WATER LEMON SPRITE","count":1}],"billiardRevenue":1519500,"cafeRevenue":12000,"topupRevenue":0}	\N	2026-06-14 17:12:36.82644
7	4	4	2026-06-15 10:30:54.75	SHIFT 1	2026-06-15 17:25:04.249	500000.00	934000.00	434000.00	-500000.00	0.00	Shift closed	CLOSED	Kasir 2	Kasir 2	PENDING	f	30	0	[{"type":"BILLIARD","id":1},{"type":"BILLIARD","id":2},{"type":"BILLIARD","id":3},{"type":"BILLIARD","id":4},{"type":"BILLIARD","id":5},{"type":"BILLIARD","id":6},{"type":"BILLIARD","id":7},{"type":"BILLIARD","id":8},{"type":"BILLIARD","id":9},{"type":"BILLIARD","id":10},{"type":"BILLIARD","id":11},{"type":"BILLIARD","id":12},{"type":"CAFE","id":1},{"type":"CAFE","id":2},{"type":"CAFE","id":3},{"type":"CAFE","id":4},{"type":"CAFE","id":5},{"type":"CAFE","id":6},{"type":"CAFE","id":7},{"type":"CAFE","id":8},{"type":"CAFE","id":9},{"type":"CAFE","id":10},{"type":"CAFE","id":11},{"type":"CAFE","id":12}]	434000.00	0.00	0.00		{"totalTransactions":10,"topWaiters":[{"name":"Kasir 2","count":10}],"topPackages":[{"name":"3 JAM WEEKDAYS","count":4},{"name":"2 JAM WEEKDAYS","count":3},{"name":"1 JAM WEEKDAYS","count":3}],"topPromos":[],"topItems":[{"name":"ICE TEA","count":4},{"name":"ICE TEA (FREE)","count":3},{"name":"AIR MINERAL","count":2},{"name":"TAMBAH TELUR","count":1},{"name":"TAMBAH ICE BATU","count":1},{"name":"NUTRI BOST","count":1},{"name":"INDOMIE GORENG","count":1},{"name":"HAND GLOVE","count":1},{"name":"CIMORY SUSU","count":1},{"name":"BLUE LAKEN","count":1}],"billiardRevenue":344000,"cafeRevenue":27000,"topupRevenue":0}	\N	2026-06-15 10:30:54.751147
8	4	4	2026-06-15 17:25:25.467	SHIFT 2	2026-06-16 02:01:46.7	500000.00	1717600.00	1217600.00	-500000.00	0.00	Shift closed	CLOSED	Kasir 2	Kasir 2	PENDING	f	0	1	[{"type":"BILLIARD","id":1},{"type":"BILLIARD","id":2},{"type":"BILLIARD","id":3},{"type":"BILLIARD","id":4},{"type":"BILLIARD","id":5},{"type":"BILLIARD","id":6},{"type":"BILLIARD","id":7},{"type":"BILLIARD","id":8},{"type":"BILLIARD","id":9},{"type":"BILLIARD","id":10},{"type":"BILLIARD","id":11},{"type":"BILLIARD","id":12},{"type":"CAFE","id":1},{"type":"CAFE","id":2},{"type":"CAFE","id":3},{"type":"CAFE","id":4},{"type":"CAFE","id":5},{"type":"CAFE","id":6},{"type":"CAFE","id":7},{"type":"CAFE","id":8},{"type":"CAFE","id":9},{"type":"CAFE","id":10},{"type":"CAFE","id":11},{"type":"CAFE","id":12}]	1217600.00	227900.00	0.00		{"totalTransactions":16,"topWaiters":[{"name":"Kasir 2","count":16}],"topPackages":[{"name":"1 JAM WEEKDAYS","count":18},{"name":"OPEN TABLE WEEKDAYS","count":6},{"name":"3 JAM WEEKDAYS","count":2},{"name":"2 JAM WEEKDAYS","count":1}],"topPromos":[],"topItems":[{"name":"ICE TEA","count":7},{"name":"AIR MINERAL","count":6},{"name":"KOPI GULA AREN","count":4},{"name":"ICE TEA (FREE)","count":2},{"name":"MIX PLATER","count":2},{"name":"BINTANG ZERO","count":2},{"name":"LEMON TEA","count":1},{"name":"KOPI SUSU","count":1},{"name":"RUJAK CIRENG","count":1},{"name":"WATER LEMON SPRITE","count":1}],"billiardRevenue":977333,"cafeRevenue":0,"topupRevenue":0}	\N	2026-06-15 17:25:25.468824
9	3	7	2026-06-16 10:09:41.537	SHIFT 1	2026-06-16 17:32:57.281	500000.00	934000.00	434000.00	-500000.00	0.00	Shift closed	CLOSED	Kasir 1	Kasir 1	PENDING	f	9	0	[{"type":"BILLIARD","id":1},{"type":"BILLIARD","id":2},{"type":"BILLIARD","id":3},{"type":"BILLIARD","id":4},{"type":"BILLIARD","id":5},{"type":"BILLIARD","id":6},{"type":"BILLIARD","id":7},{"type":"BILLIARD","id":8},{"type":"BILLIARD","id":9},{"type":"BILLIARD","id":10},{"type":"BILLIARD","id":11},{"type":"BILLIARD","id":12},{"type":"CAFE","id":1},{"type":"CAFE","id":2},{"type":"CAFE","id":3},{"type":"CAFE","id":4},{"type":"CAFE","id":5},{"type":"CAFE","id":6},{"type":"CAFE","id":7},{"type":"CAFE","id":8},{"type":"CAFE","id":9},{"type":"CAFE","id":10},{"type":"CAFE","id":11},{"type":"CAFE","id":12}]	434000.00	97000.00	0.00		{"totalTransactions":9,"topWaiters":[{"name":"Kasir 1","count":9}],"topPackages":[{"name":"1 JAM WEEKEND","count":10},{"name":"3 JAM WEEKEND","count":6},{"name":"OPEN TABLE WEEKEND","count":1}],"topPromos":[],"topItems":[{"name":"ICE TEA (FREE)","count":5},{"name":"AIR MINERAL","count":4},{"name":"ICE TEA","count":3},{"name":"LEMON TEA","count":2},{"name":"RED VELVET","count":2},{"name":"YOU C 1000","count":1},{"name":"CAPPUCINNO","count":1},{"name":"MIX PLATER","count":1},{"name":"KOPI HITAM","count":1},{"name":"SOSIS MERAH","count":1}],"billiardRevenue":555000,"cafeRevenue":0,"topupRevenue":0}	\N	2026-06-16 10:09:41.539132
10	4	7	2026-06-16 17:33:16.355	SHIFT 2	2026-06-17 01:41:42.608	500000.00	1528000.00	1518500.00	-9500.00	0.00	Shift closed	CLOSED	Kasir 2	Kasir 2	PENDING	f	0	0	[{"type":"BILLIARD","id":1},{"type":"BILLIARD","id":2},{"type":"BILLIARD","id":3},{"type":"BILLIARD","id":4},{"type":"BILLIARD","id":5},{"type":"BILLIARD","id":6},{"type":"BILLIARD","id":7},{"type":"BILLIARD","id":8},{"type":"BILLIARD","id":9},{"type":"BILLIARD","id":10},{"type":"BILLIARD","id":11},{"type":"BILLIARD","id":12},{"type":"CAFE","id":1},{"type":"CAFE","id":2},{"type":"CAFE","id":3},{"type":"CAFE","id":4},{"type":"CAFE","id":5},{"type":"CAFE","id":6},{"type":"CAFE","id":7},{"type":"CAFE","id":8},{"type":"CAFE","id":9},{"type":"CAFE","id":10},{"type":"CAFE","id":11},{"type":"CAFE","id":12}]	1028000.00	90000.00	0.00		{"totalTransactions":15,"topWaiters":[{"name":"Kasir 2","count":15}],"topPackages":[{"name":"1 JAM WEEKEND","count":17},{"name":"OPEN TABLE WEEKEND","count":3},{"name":"3 JAM WEEKEND","count":1}],"topPromos":[],"topItems":[{"name":"AIR MINERAL","count":4},{"name":"TARO","count":3},{"name":"ICE TEA","count":3},{"name":"LEMON TEA","count":2},{"name":"LYCHEE TEA","count":1},{"name":"PANDAN COFFE","count":1},{"name":"COOKIES & CREAM","count":1},{"name":"HAND GLOVE","count":1},{"name":"ICE TEA (FREE)","count":1},{"name":"KOPI HITAM","count":1}],"billiardRevenue":820500,"cafeRevenue":47000,"topupRevenue":0}	\N	2026-06-16 17:33:16.357817
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
5	MEJA 5	BILLIARD	3	DCDA0C11F150	192.168.0.100	1			PCF8575	available	-58	258277	2026-06-17 04:19:40.485	f	4	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-06-12 03:10:56.659122	2026-06-17 04:19:40.486276	\N
6	MEJA 6	BILLIARD	3	DCDA0C11F150	192.168.0.100	1			PCF8575	available	-58	258277	2026-06-17 04:19:40.378	f	5	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-06-12 03:11:07.055411	2026-06-17 04:19:40.384594	\N
8	MEJA 8	BILLIARD	3	DCDA0C11F150	192.168.0.100	1			PCF8575	available	-58	258277	2026-06-17 04:19:40.479	f	7	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-06-12 03:11:29.069299	2026-06-17 04:19:40.480537	\N
9	MEJA 9	BILLIARD	2	DCDA0C11F150	192.168.0.100	1			PCF8575	available	-58	258277	2026-06-17 04:19:40.481	f	8	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-06-12 03:11:39.224941	2026-06-17 04:19:40.482485	\N
11	MEJA 11	BILLIARD	1	DCDA0C11F150	192.168.0.100	1			PCF8575	available	-58	258277	2026-06-17 04:19:40.487	f	10	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-06-12 03:12:03.151085	2026-06-17 04:19:40.487941	\N
3	MEJA 3	BILLIARD	3	DCDA0C11F150	192.168.0.100	1			PCF8575	available	-58	258277	2026-06-17 04:19:40.489	f	2	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-06-12 03:10:31.368676	2026-06-17 04:19:40.490056	\N
2	MEJA 2	BILLIARD	3	DCDA0C11F150	192.168.0.100	1			PCF8575	available	-58	258277	2026-06-17 04:19:40.49	f	1	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-06-12 03:10:20.747631	2026-06-17 04:19:40.491619	\N
10	MEJA 10	BILLIARD	2	DCDA0C11F150	192.168.0.100	1			PCF8575	available	-58	258277	2026-06-17 04:19:40.512	f	9	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-06-12 03:11:51.296755	2026-06-17 04:19:40.513583	\N
7	MEJA 7	BILLIARD	3	DCDA0C11F150	192.168.0.100	1			PCF8575	available	-58	258277	2026-06-17 04:19:40.591	f	6	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-06-12 03:11:18.313029	2026-06-17 04:19:40.592308	\N
4	MEJA 4	BILLIARD	3	DCDA0C11F150	192.168.0.100	1			PCF8575	available	-58	258277	2026-06-17 04:19:40.593	f	3	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-06-12 03:10:47.400111	2026-06-17 04:19:40.594227	\N
12	MEJA 12	BILLIARD	1	DCDA0C11F150	192.168.0.100	1			PCF8575	available	-58	258277	2026-06-17 04:19:40.595	f	11	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-06-12 03:12:13.152424	2026-06-17 04:19:40.596115	\N
1	MEJA 1	BILLIARD	3	DCDA0C11F150	192.168.0.100	1			PCF8575	available	-58	258283	2026-06-17 04:19:47.238	f	0	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-06-12 03:09:35.117982	2026-06-17 04:19:47.252176	\N
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
37	37	slim	0.00	0.00	0.00	0.00	0.00	0.00	20000.00	CASH	[]	2026-06-13 12:03:18.266009	3	3	2
38	38	SALOM	0.00	0.00	0.00	0.00	0.00	0.00	61000.00	CASH	[]	2026-06-13 14:06:02.575843	3	3	2
39	39	ROBI	0.00	0.00	0.00	0.00	0.00	0.00	55000.00	CASH	[]	2026-06-13 16:00:09.700608	3	3	2
40	41	YOGA	0.00	0.00	0.00	0.00	0.00	0.00	36000.00	QRIS	[]	2026-06-13 19:22:31.285685	4	4	2
41	40	MR. x	0.00	0.00	0.00	0.00	0.00	0.00	72000.00	CASH	[]	2026-06-13 20:07:01.840413	4	4	2
42	45	LEONARDO	0.00	0.00	0.00	0.00	0.00	0.00	66000.00	CASH	[]	2026-06-13 21:47:40.657069	4	4	2
43	46	KAKA	0.00	0.00	0.00	0.00	0.00	0.00	72000.00	CASH	[]	2026-06-13 22:03:02.809574	4	4	2
44	42	JOKOWI	0.00	0.00	0.00	0.00	0.00	0.00	92000.00	CASH	[]	2026-06-13 22:10:52.488001	4	4	2
45	47	NGOPEK	0.00	0.00	0.00	0.00	0.00	0.00	92000.00	CASH	[]	2026-06-13 22:27:21.252641	4	4	2
46	51	OBI	0.00	0.00	0.00	0.00	0.00	0.00	95000.00	QRIS	[]	2026-06-13 22:33:14.958922	4	4	2
47	43	YUANGGA	0.00	0.00	0.00	0.00	0.00	0.00	217000.00	QRIS	[]	2026-06-13 22:34:39.683376	4	4	2
48	44	RIAN	0.00	0.00	0.00	0.00	0.00	0.00	105000.00	QRIS	[]	2026-06-13 22:34:59.120201	4	4	2
49	49	SATRIYA	0.00	0.00	0.00	0.00	0.00	0.00	70000.00	CASH	[]	2026-06-13 23:10:01.418163	4	4	2
50	52	ADIT	0.00	0.00	0.00	0.00	0.00	0.00	86400.00	CASH	[]	2026-06-13 23:39:54.297465	4	4	2
51	58	MIKO	0.00	0.00	0.00	0.00	0.00	0.00	35000.00	CASH	[]	2026-06-13 23:45:42.180292	4	4	2
52	53	ADIT	0.00	0.00	0.00	0.00	0.00	0.00	86000.00	CASH	[]	2026-06-14 00:02:37.470492	4	4	2
53	50	AWAN	0.00	0.00	0.00	0.00	0.00	0.00	103000.00	QRIS	[]	2026-06-14 00:05:45.343902	4	4	2
54	60	SATRIYO	0.00	0.00	0.00	0.00	0.00	0.00	36000.00	CASH	[]	2026-06-14 00:13:00.775817	4	4	2
55	48	ASWAR	0.00	0.00	0.00	0.00	0.00	0.00	134000.00	QRIS	[]	2026-06-14 00:19:31.945236	4	4	2
56	56	NOPUL	0.00	0.00	0.00	0.00	0.00	0.00	72000.00	CASH	[]	2026-06-14 00:33:16.264752	4	4	2
57	54	CAHYO	0.00	0.00	0.00	0.00	0.00	0.00	115000.00	QRIS	[]	2026-06-14 01:06:54.959454	4	4	2
58	59	Payer 1	0.00	100000.00	0.00	0.00	0.00	0.00	100000.00	CASH	[]	2026-06-14 01:08:52.335361	4	4	2
59	59	BAYU	0.00	0.00	0.00	0.00	0.00	0.00	168300.00	QRIS	[]	2026-06-14 01:09:24.231676	4	4	2
60	55	AMAR	0.00	0.00	0.00	0.00	0.00	0.00	159000.00	CASH	[]	2026-06-14 01:12:41.346446	4	4	2
61	64	?	0.00	0.00	0.00	0.00	0.00	0.00	30000.00	CASH	[]	2026-06-14 02:18:54.487693	4	4	2
62	61	AGUNG	0.00	0.00	0.00	0.00	0.00	0.00	94500.00	CASH	[]	2026-06-14 02:22:11.658321	4	4	2
63	63	AMAR	0.00	0.00	0.00	0.00	0.00	0.00	42500.00	CASH	[]	2026-06-14 02:37:30.460906	4	4	2
64	57	AGUNG	0.00	0.00	0.00	0.00	0.00	0.00	159500.00	CASH	[]	2026-06-14 02:56:51.47702	4	4	2
65	62	VOL	0.00	0.00	0.00	0.00	0.00	0.00	90000.00	CASH	[]	2026-06-14 03:08:09.496918	4	4	2
66	66	SLIMIN	0.00	0.00	0.00	0.00	0.00	0.00	30000.00	CASH	[]	2026-06-14 03:32:05.406412	4	4	2
67	65	TATANG	0.00	0.00	0.00	0.00	0.00	0.00	114000.00	CASH	[]	2026-06-14 04:31:31.24232	4	4	2
68	67	YURO	0.00	0.00	0.00	0.00	0.00	0.00	20000.00	CASH	[]	2026-06-14 11:11:50.914018	3	5	3
69	68	ANDI	0.00	0.00	0.00	0.00	0.00	0.00	20000.00	CASH	[]	2026-06-14 11:31:37.328929	3	5	3
70	69	SLIM	0.00	0.00	0.00	0.00	0.00	0.00	20000.00	CASH	[]	2026-06-14 12:55:22.599879	3	5	3
71	71	ABI	0.00	0.00	0.00	0.00	0.00	0.00	20000.00	QRIS	[]	2026-06-14 13:51:48.316442	3	5	3
72	72	BIMA	0.00	0.00	0.00	0.00	0.00	0.00	57000.00	CASH	[]	2026-06-14 15:23:14.505004	3	5	3
73	76	IMAN	0.00	0.00	0.00	0.00	0.00	0.00	50000.00	CASH	[]	2026-06-14 16:09:03.901597	3	5	3
74	74	RUDIN	0.00	0.00	0.00	0.00	0.00	0.00	70000.00	CASH	[]	2026-06-14 16:31:13.24048	3	5	3
75	73	VEGA	0.00	0.00	0.00	0.00	0.00	0.00	61000.00	CASH	[]	2026-06-14 17:05:25.907731	3	5	3
76	79	DILA	0.00	0.00	0.00	0.00	0.00	0.00	15000.00	CASH	[]	2026-06-14 17:35:05.7263	4	6	3
77	75	DONI	0.00	0.00	0.00	0.00	0.00	0.00	100000.00	CASH	[]	2026-06-14 17:43:36.004117	4	6	3
78	70	FAJAR	0.00	0.00	0.00	0.00	0.00	0.00	183200.00	QRIS	[]	2026-06-14 18:04:40.881607	4	6	3
79	78	KOCO	0.00	0.00	0.00	0.00	0.00	0.00	50000.00	CASH	[]	2026-06-14 18:12:06.300628	4	6	3
80	77	SAMSUL	0.00	0.00	0.00	0.00	0.00	0.00	95000.00	CASH	[]	2026-06-14 18:34:12.305973	4	6	3
81	82	SAMSUL	0.00	0.00	0.00	0.00	0.00	0.00	35000.00	CASH	[]	2026-06-14 19:37:40.052566	4	6	3
82	80	DIMAS	0.00	0.00	0.00	0.00	0.00	0.00	92000.00	CASH	[]	2026-06-14 19:56:46.180909	4	6	3
83	83	MAULANA	0.00	0.00	0.00	0.00	0.00	0.00	76000.00	QRIS	[]	2026-06-14 20:41:15.724213	4	6	3
84	85	YOFI	0.00	0.00	0.00	0.00	0.00	0.00	101000.00	CASH	[]	2026-06-14 20:45:02.486519	4	6	3
85	86	REZA	0.00	0.00	0.00	0.00	0.00	0.00	100000.00	CASH	[]	2026-06-14 21:00:50.242337	4	6	3
86	87	FEBRI	0.00	0.00	0.00	0.00	0.00	0.00	100000.00	CASH	[]	2026-06-14 21:20:45.021148	4	6	3
87	81	SADA	0.00	0.00	0.00	0.00	0.00	0.00	107000.00	QRIS	[]	2026-06-14 21:27:04.598536	4	6	3
88	89	GILANG	0.00	0.00	0.00	0.00	0.00	0.00	100000.00	CASH	[]	2026-06-14 21:34:06.478236	4	6	3
89	84	TEGAR	0.00	0.00	0.00	0.00	0.00	0.00	115000.00	QRIS	[]	2026-06-14 21:42:20.156176	4	6	3
90	88	ANDRI	0.00	0.00	0.00	0.00	0.00	0.00	200000.00	CASH	[]	2026-06-14 22:29:17.050454	4	6	3
91	90	SIBI	0.00	0.00	0.00	0.00	0.00	0.00	60000.00	CASH	[]	2026-06-14 22:41:58.997753	4	6	3
92	91	YOFI	0.00	0.00	0.00	0.00	0.00	0.00	66000.00	CASH	[]	2026-06-14 22:47:02.982919	4	6	3
93	94	?	0.00	0.00	0.00	0.00	0.00	0.00	45000.00	CASH	[]	2026-06-14 23:01:29.702697	4	6	3
94	95	NOFAL	0.00	0.00	0.00	0.00	0.00	0.00	100000.00	CASH	[]	2026-06-14 23:04:15.146906	4	6	3
95	97	?	0.00	0.00	0.00	0.00	0.00	0.00	70000.00	CASH	[]	2026-06-15 00:04:26.963423	4	6	3
96	93	ATTA	0.00	0.00	0.00	0.00	0.00	0.00	83500.00	CASH	[]	2026-06-15 00:28:08.257129	4	6	3
97	92	ANDRE	0.00	0.00	0.00	0.00	0.00	0.00	106000.00	CASH	[]	2026-06-15 00:29:15.348229	4	6	3
98	96	ADIT	0.00	0.00	0.00	0.00	0.00	0.00	74000.00	CASH	[]	2026-06-15 00:45:52.622217	4	6	3
99	98	JON	0.00	0.00	0.00	0.00	0.00	0.00	75000.00	CASH	[]	2026-06-15 00:47:02.823051	4	6	3
100	100	nopal	0.00	0.00	0.00	0.00	0.00	0.00	30000.00	CASH	[]	2026-06-15 01:20:48.869806	4	6	3
101	99	REYHAN	0.00	0.00	0.00	0.00	0.00	0.00	100000.00	CASH	[]	2026-06-15 01:38:47.499338	4	6	3
102	101	...	0.00	0.00	0.00	0.00	0.00	0.00	90000.00	CASH	[]	2026-06-15 02:22:35.183321	4	6	3
103	102	jon	0.00	0.00	0.00	0.00	0.00	0.00	75000.00	CASH	[]	2026-06-15 02:38:34.5371	4	6	3
104	103	jokowi	0.00	0.00	0.00	0.00	0.00	0.00	90000.00	QRIS	[]	2026-06-15 04:12:52.773376	4	6	3
105	104	HUMAN	0.00	0.00	0.00	0.00	0.00	0.00	47000.00	CASH	[]	2026-06-15 12:11:46.527492	4	7	4
106	105	. 	0.00	0.00	0.00	0.00	0.00	0.00	49000.00	CASH	[]	2026-06-15 12:19:44.015087	4	7	4
107	107	SLIMIN	0.00	0.00	0.00	0.00	0.00	0.00	20000.00	CASH	[]	2026-06-15 12:36:04.290431	4	7	4
108	106	LUKI	0.00	0.00	0.00	0.00	0.00	0.00	83000.00	CASH	[]	2026-06-15 14:28:26.291459	4	7	4
109	108	REZA	0.00	0.00	0.00	0.00	0.00	0.00	55000.00	CASH	[]	2026-06-15 14:29:24.337801	4	7	4
110	109	LANA	0.00	0.00	0.00	0.00	0.00	0.00	35000.00	CASH	[]	2026-06-15 14:52:28.156854	4	7	4
111	113	.	0.00	0.00	0.00	0.00	0.00	0.00	12000.00	CASH	[]	2026-06-15 14:53:30.884212	4	7	4
112	111	INDRA	0.00	0.00	0.00	0.00	0.00	0.00	67000.00	CASH	[]	2026-06-15 16:49:56.718504	4	7	4
113	112	.	0.00	0.00	0.00	0.00	0.00	0.00	62000.00	CASH	[]	2026-06-15 16:51:10.373661	4	7	4
114	114	.	0.00	0.00	0.00	0.00	0.00	0.00	15000.00	CASH	[]	2026-06-15 16:53:27.484375	4	7	4
115	110	HARTONO	0.00	0.00	0.00	0.00	0.00	0.00	85000.00	CASH	[]	2026-06-15 17:24:12.996793	4	7	4
116	115	ARTA	0.00	0.00	0.00	0.00	0.00	0.00	50000.00	CASH	[]	2026-06-15 18:36:43.943587	4	8	4
117	119	YENI	0.00	0.00	0.00	0.00	0.00	0.00	50000.00	CASH	[]	2026-06-15 20:32:13.294412	4	8	4
118	116	...	0.00	0.00	0.00	0.00	0.00	0.00	100000.00	CASH	[]	2026-06-15 20:37:40.322677	4	8	4
119	117	ROI	0.00	0.00	0.00	0.00	0.00	0.00	71000.00	CASH	[]	2026-06-15 21:06:07.714626	4	8	4
120	118	PUNGKY	0.00	0.00	0.00	0.00	0.00	0.00	100000.00	CASH	[]	2026-06-15 21:14:24.265814	4	8	4
121	120	RICKY	0.00	0.00	0.00	0.00	0.00	0.00	100000.00	CASH	[]	2026-06-15 21:47:17.318482	4	8	4
122	122	AALEX	0.00	0.00	0.00	0.00	0.00	0.00	109600.00	CASH	[]	2026-06-15 22:20:45.736138	4	8	4
123	123	ANTON	0.00	0.00	0.00	0.00	0.00	0.00	91000.00	CASH	[]	2026-06-15 23:25:40.32393	4	8	4
124	127	RENDY 	0.00	0.00	0.00	0.00	0.00	0.00	60000.00	CASH	[]	2026-06-15 23:29:55.476401	4	8	4
125	125	lerian	0.00	0.00	0.00	0.00	0.00	0.00	125000.00	CASH	[]	2026-06-15 23:34:27.20734	4	8	4
126	128	ANA	0.00	0.00	0.00	0.00	0.00	0.00	80000.00	CASH	[]	2026-06-15 23:42:13.153036	4	8	4
127	124	MAMAT	0.00	0.00	0.00	0.00	0.00	0.00	77000.00	CASH	[]	2026-06-15 23:46:07.0036	4	8	4
128	121	ARTA	0.00	0.00	0.00	0.00	0.00	0.00	146900.00	QRIS	[]	2026-06-16 00:11:39.472509	4	8	4
129	129	....	0.00	0.00	0.00	0.00	0.00	0.00	124000.00	CASH	[]	2026-06-16 00:25:26.958084	4	8	4
130	126	Payer 1	0.00	30000.00	0.00	0.00	0.00	0.00	30000.00	CASH	[]	2026-06-16 00:26:14.235466	4	8	4
131	126	UCUP	0.00	0.00	0.00	0.00	0.00	0.00	81000.00	QRIS	[]	2026-06-16 00:26:46.350686	4	8	4
132	130	REHAN	0.00	0.00	0.00	0.00	0.00	0.00	50000.00	CASH	[]	2026-06-16 01:39:42.932458	4	8	4
133	131	AGUNG	0.00	0.00	0.00	0.00	0.00	0.00	50000.00	CASH	[]	2026-06-16 01:52:47.478556	4	8	4
134	132	ANDI	0.00	0.00	0.00	0.00	0.00	0.00	54000.00	CASH	[]	2026-06-16 12:12:05.507979	3	9	7
135	136	ALEN	0.00	0.00	0.00	0.00	0.00	0.00	52000.00	CASH	[]	2026-06-16 13:47:58.71211	3	9	7
136	134	RAFLI	0.00	0.00	0.00	0.00	0.00	0.00	121000.00	CASH	[]	2026-06-16 14:07:03.301473	3	9	7
137	133	RIZAQ	0.00	0.00	0.00	0.00	0.00	0.00	107000.00	CASH	[]	2026-06-16 15:09:13.431452	3	9	7
138	135	ICHI	0.00	0.00	0.00	0.00	0.00	0.00	97000.00	QRIS	[]	2026-06-16 15:39:52.290939	3	9	7
139	137	candra	0.00	0.00	0.00	0.00	0.00	0.00	100000.00	CASH	[]	2026-06-16 16:00:59.197879	3	9	7
140	140	bogel	0.00	0.00	0.00	0.00	0.00	0.00	102000.00	CASH	[]	2026-06-16 17:51:37.173123	4	10	7
141	138	bagus	0.00	0.00	0.00	0.00	0.00	0.00	100000.00	CASH	[]	2026-06-16 18:19:09.992609	4	10	7
142	139	lucky	0.00	0.00	0.00	0.00	0.00	0.00	112000.00	QRIS	[]	2026-06-16 18:27:04.055265	4	10	7
143	143	IAN	0.00	0.00	0.00	0.00	0.00	0.00	50000.00	CASH	[]	2026-06-16 20:23:14.637551	4	10	7
144	141	IKHROM	0.00	0.00	0.00	0.00	0.00	0.00	72000.00	CASH	[]	2026-06-16 20:56:55.788337	4	10	7
145	144	DIDIK	0.00	0.00	0.00	0.00	0.00	0.00	60000.00	CASH	[]	2026-06-16 21:19:16.09322	4	10	7
146	145	JAPA	0.00	0.00	0.00	0.00	0.00	0.00	100000.00	CASH	[]	2026-06-16 21:35:43.657613	4	10	7
147	152	AKBAR	0.00	0.00	0.00	0.00	0.00	0.00	20000.00	CASH	[]	2026-06-16 21:55:42.645789	4	10	7
148	147	.	0.00	0.00	0.00	0.00	0.00	0.00	30000.00	QRIS	[]	2026-06-16 22:06:13.88559	4	10	7
149	142	SALOM	0.00	0.00	0.00	0.00	0.00	0.00	100000.00	CASH	[]	2026-06-16 22:10:36.838037	4	10	7
150	150	SLIM	0.00	0.00	0.00	0.00	0.00	0.00	30000.00	CASH	[]	2026-06-16 22:11:00.93426	4	10	7
151	148	NOPAL	0.00	0.00	0.00	0.00	0.00	0.00	60000.00	QRIS	[]	2026-06-16 22:29:17.761777	4	10	7
152	149	ARIF	0.00	0.00	0.00	0.00	0.00	0.00	116000.00	CASH	[]	2026-06-16 22:35:58.648068	4	10	7
153	153	AKBAR	0.00	0.00	0.00	0.00	0.00	0.00	30000.00	CASH	[]	2026-06-16 23:02:02.126462	4	10	7
154	146	ALPAN	0.00	0.00	0.00	0.00	0.00	0.00	130000.00	CASH	[]	2026-06-16 23:54:37.634061	4	10	7
155	154	WILDAN	0.00	0.00	0.00	0.00	0.00	0.00	60000.00	CASH	[]	2026-06-17 00:27:54.874107	4	10	7
156	151	UNYIL	0.00	0.00	0.00	0.00	0.00	0.00	160000.00	CASH	[]	2026-06-17 00:31:03.148138	4	10	7
157	155	AMIR	0.00	0.00	0.00	0.00	0.00	0.00	100000.00	CASH	[]	2026-06-17 01:36:58.624882	4	10	7
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
37	TAB-260613102107	slim	\N	\N	2	\N	\N	PAID	BILLIARD	prepaid	1 JAM WEEKEND	2026-06-13 10:21:06.997	2026-06-13 11:21:06.997	\N	20000.00	0.00	20000.00	0.00	0.00	0.00	0.00	20000.00	[{"method":"CASH","amount":20000,"payer":"slim","timestamp":"2026-06-13T05:03:18.266Z","paymentId":37}]	[{"title":"1 JAM WEEKEND","duration":60,"subtotal":20000,"isExtension":false,"ratePerHour":20000,"startTimeFormatted":"10.21","endTimeFormatted":"11.21"}]	\N	[]	3	3	3	\N	3	2	12	0	0.00	\N	\N	\N	0.00	0.00	2026-06-13 10:21:07.067977	2026-06-13 12:03:18.266009
13	TAB-260612185642	lana	\N	\N	12	\N	\N	PAID	BILLIARD	prepaid	3 JAM WEEKEND	2026-06-12 18:56:42.905	2026-06-12 21:56:42.905	\N	130000.00	0.00	130000.00	0.00	0.00	0.00	0.00	130000.00	[{"method":"QRIS","amount":130000,"payer":"lana","timestamp":"2026-06-12T14:57:13.478Z","paymentId":17}]	[{"title":"3 JAM WEEKEND","duration":180,"subtotal":130000,"isExtension":false,"ratePerHour":130000,"startTimeFormatted":"18.56","endTimeFormatted":"21.56"}]	\N	[]	4	4	4	\N	2	1	19	0	0.00	\N	\N	\N	0.00	0.00	2026-06-12 18:56:42.978662	2026-06-12 21:57:13.478933
8	TAB-260612141102	KACONG	\N	\N	6	\N	\N	PAID	BILLIARD	prepaid	1 JAM WEEKDAYS	2026-06-12 14:11:02.657	2026-06-12 15:11:02.657	\N	20000.00	0.00	20000.00	0.00	0.00	0.00	0.00	20000.00	[{"method":"CASH","amount":20000,"payer":"KACONG","timestamp":"2026-06-12T08:20:49.599Z","paymentId":6}]	[{"title":"1 JAM WEEKDAYS","duration":60,"subtotal":20000,"isExtension":false,"ratePerHour":20000,"startTimeFormatted":"14.11","endTimeFormatted":"15.11"}]	\N	[]	3	3	3	\N	1	1	6	0	0.00	\N	\N	\N	0.00	0.00	2026-06-12 14:11:02.701892	2026-06-12 15:20:49.599181
4	TAB-260612113911	NAFI	\N	\N	7	\N	\N	PAID	BILLIARD	open	OPEN TABLE WEEKDAYS	2026-06-12 11:39:11.52	2026-06-12 13:50:38.743	\N	44000.00	0.00	44000.00	0.00	0.00	0.00	0.00	44000.00	[{"method":"CASH","amount":44000,"payer":"NAFI","timestamp":"2026-06-12T06:52:16.917Z","paymentId":3}]	[{"title":"10:00-18:00","date":"12/06/2026","startTimeFormatted":"11.39","duration":132,"cost":44000.00000000004,"isExtension":false,"ratePerHour":20000,"subtotal":44000,"endTimeFormatted":"13.51"}]	\N	[]	3	3	3	\N	1	1	5	0	0.00	\N	\N	\N	0.00	0.00	2026-06-12 11:39:11.572117	2026-06-12 13:52:16.917672
10	TAB-260612164435	SLIMIN	\N	\N	1	\N	\N	PAID	BILLIARD	prepaid	1 JAM WEEKEND	2026-06-12 16:44:35.7	2026-06-12 17:44:35.7	\N	20000.00	0.00	20000.00	0.00	0.00	0.00	0.00	20000.00	[{"method":"CASH","amount":20000,"payer":"SLIMIN","timestamp":"2026-06-12T10:49:15.789Z","paymentId":9}]	[{"title":"1 JAM WEEKEND","duration":60,"subtotal":20000,"isExtension":false,"ratePerHour":20000,"startTimeFormatted":"16.44","endTimeFormatted":"17.44"}]	\N	[]	3	3	3	\N	1	1	12	0	0.00	\N	\N	\N	0.00	0.00	2026-06-12 16:44:35.749568	2026-06-12 17:49:15.78988
11	TAB-260612170026	ELIN	\N	\N	10	\N	\N	PAID	BILLIARD	prepaid	1 JAM WEEKEND	2026-06-12 17:00:26.293	2026-06-12 19:00:26.293	\N	70000.00	0.00	70000.00	0.00	0.00	0.00	0.00	70000.00	[{"method":"QRIS","amount":70000,"payer":"ELIN","timestamp":"2026-06-12T12:05:34.859Z","paymentId":10}]	[{"title":"1 JAM WEEKEND","duration":0,"subtotal":35000,"isExtension":false,"ratePerHour":0,"logTime":"2026-06-12T10:00:44.018Z"},{"title":"Extend 1 JAM WEEKEND","duration":60,"subtotal":35000,"startTimeFormatted":"18.00","endTimeFormatted":"19.00","logTime":"2026-06-12T10:00:44.018Z"}]	\N	[]	3	3	3	\N	1	1	15	0	0.00	\N	\N	\N	0.00	0.00	2026-06-12 17:00:26.361947	2026-06-12 19:05:34.859853
14	TAB-260612190225	niko	\N	\N	4	\N	\N	PAID	BILLIARD	open	OPEN TABLE WEEKEND	2026-06-12 19:02:25.502	2026-06-12 21:02:25.335	\N	60000.00	0.00	60000.00	0.00	0.00	0.00	0.00	60000.00	[{"method":"CASH","amount":60000,"payer":"niko","timestamp":"2026-06-12T14:02:53.097Z","paymentId":14}]	[{"title":"17:00-02:00","date":"12/06/2026","startTimeFormatted":"19.02","duration":120,"cost":60000.00000000001,"isExtension":false,"ratePerHour":30000,"subtotal":60000,"endTimeFormatted":"21.02"}]	\N	[]	4	4	4	\N	2	1	11	0	0.00	\N	\N	\N	0.00	0.00	2026-06-12 19:02:25.553138	2026-06-12 21:02:53.09793
38	TAB-260613110242	SALOM	\N	\N	1	\N	\N	PAID	BILLIARD	prepaid	3 JAM WEEKEND	2026-06-13 11:02:42.571	2026-06-13 14:02:42.571	\N	55000.00	6000.00	61000.00	0.00	0.00	0.00	0.00	61000.00	[{"method":"CASH","amount":61000,"payer":"SALOM","timestamp":"2026-06-13T07:06:02.575Z","paymentId":38}]	[{"title":"3 JAM WEEKEND","duration":180,"subtotal":55000,"isExtension":false,"ratePerHour":55000,"startTimeFormatted":"11.02","endTimeFormatted":"14.02"}]	\N	[]	3	3	3	\N	3	2	13	0	0.00	\N	\N	\N	0.00	0.00	2026-06-13 11:02:42.653075	2026-06-13 14:06:02.575843
19	TAB-260612194030	IQBAL	\N	\N	2	\N	\N	PAID	BILLIARD	prepaid	1 JAM WEEKEND	2026-06-12 19:40:30.86	2026-06-12 22:42:04.958	\N	90000.00	0.00	90000.00	0.00	0.00	0.00	0.00	90000.00	[{"method":"CASH","amount":90000,"payer":"IQBAL","timestamp":"2026-06-12T15:46:12.575Z","paymentId":19}]	[{"title":"1 JAM WEEKEND","duration":0,"subtotal":30000,"isExtension":false,"ratePerHour":0,"logTime":"2026-06-12T12:40:34.848Z"},{"title":"Extend 1 JAM WEEKEND","duration":60,"subtotal":30000,"startTimeFormatted":"20.40","endTimeFormatted":"21.40","logTime":"2026-06-12T12:40:34.848Z"},{"title":"Extend 1 JAM WEEKEND","duration":60,"subtotal":30000,"startTimeFormatted":"21.42","endTimeFormatted":"22.42","logTime":"2026-06-12T14:42:05.026Z"}]	\N	[]	4	4	4	\N	2	1	12	0	0.00	\N	\N	\N	0.00	0.00	2026-06-12 19:40:30.905265	2026-06-12 22:46:12.575696
48	TAB-260613205044	ASWAR	\N	\N	2	\N	\N	PAID	BILLIARD	open	OPEN TABLE WEEKEND	2026-06-13 20:50:44.41	2026-06-14 00:15:57.265	\N	103000.00	31000.00	134000.00	0.00	0.00	0.00	0.00	134000.00	[{"method":"QRIS","amount":134000,"payer":"ASWAR","timestamp":"2026-06-13T17:19:31.945Z","paymentId":55}]	[{"title":"17:00-02:00","date":"13/06/2026","startTimeFormatted":"20.50","duration":190,"cost":95000.00000000001,"isExtension":false,"ratePerHour":30000,"subtotal":95000,"endTimeFormatted":"00.00"},{"title":"17:00-02:00","date":"14/06/2026","startTimeFormatted":"00.00","duration":16,"cost":8000.000000000001,"isExtension":false,"ratePerHour":30000,"subtotal":8000,"endTimeFormatted":"00.16"}]	\N	[]	4	4	4	\N	4	2	11	0	0.00	\N	\N	\N	0.00	0.00	2026-06-13 20:50:44.460454	2026-06-14 00:19:31.945236
9	TAB-260612153321	FIKRI	\N	\N	9	\N	\N	PAID	BILLIARD	prepaid	3 JAM WEEKEND	2026-06-12 15:33:21.472	2026-06-12 19:34:04.375	\N	105000.00	0.00	105000.00	0.00	0.00	0.00	0.00	105000.00	[{"method":"CASH","amount":105000,"payer":"FIKRI","timestamp":"2026-06-12T12:38:39.057Z","paymentId":11}]	[{"title":"3 JAM WEEKEND","duration":180,"subtotal":70000,"isExtension":false,"ratePerHour":70000,"startTimeFormatted":"15.33","endTimeFormatted":"18.33"},{"title":"Extend 1 JAM WEEKEND","duration":60,"subtotal":35000,"startTimeFormatted":"18.34","endTimeFormatted":"19.34","logTime":"2026-06-12T11:34:04.452Z"}]	\N	[]	3	3	3	\N	1	1	16	0	0.00	\N	\N	\N	0.00	0.00	2026-06-12 15:33:21.552999	2026-06-12 19:38:39.057348
17	TAB-260612191149	hasan	\N	\N	10	\N	\N	PAID	BILLIARD	prepaid	1 JAM WEEKEND	2026-06-12 19:11:49.046	2026-06-12 21:11:49.046	\N	70000.00	0.00	70000.00	0.00	0.00	0.00	0.00	70000.00	[{"method":"CASH","amount":70000,"payer":"hasan","timestamp":"2026-06-12T14:15:36.375Z","paymentId":15}]	[{"title":"1 JAM WEEKEND","duration":0,"subtotal":35000,"isExtension":false,"ratePerHour":0,"logTime":"2026-06-12T12:11:54.496Z"},{"title":"Extend 1 JAM WEEKEND","duration":60,"subtotal":35000,"startTimeFormatted":"20.11","endTimeFormatted":"21.11","logTime":"2026-06-12T12:11:54.496Z"}]	\N	[]	4	4	4	\N	2	1	15	0	0.00	\N	\N	\N	0.00	0.00	2026-06-12 19:11:49.088672	2026-06-12 21:15:36.375554
60	TAB-260613231203	SATRIYO	\N	\N	8	\N	\N	PAID	BILLIARD	prepaid	1 JAM WEEKEND	2026-06-13 23:12:03.209	2026-06-14 00:12:03.209	\N	30000.00	6000.00	36000.00	0.00	0.00	0.00	0.00	36000.00	[{"method":"CASH","amount":36000,"payer":"SATRIYO","timestamp":"2026-06-13T17:13:00.775Z","paymentId":54}]	[{"title":"1 JAM WEEKEND","duration":60,"subtotal":30000,"isExtension":false,"ratePerHour":30000,"startTimeFormatted":"23.12","endTimeFormatted":"24.12"}]	\N	[]	4	4	4	\N	4	2	12	0	0.00	\N	\N	\N	0.00	0.00	2026-06-13 23:12:03.257265	2026-06-14 00:13:00.775817
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
53	TAB-260613215538	ADIT	\N	\N	5	\N	\N	PAID	BILLIARD	prepaid	1 JAM WEEKEND	2026-06-13 21:55:37.982	2026-06-13 23:55:37.982	\N	60000.00	26000.00	86000.00	0.00	0.00	0.00	0.00	86000.00	[{"method":"CASH","amount":86000,"payer":"ADIT","timestamp":"2026-06-13T17:02:37.470Z","paymentId":52}]	[{"title":"1 JAM WEEKEND","duration":0,"subtotal":30000,"isExtension":false,"ratePerHour":0,"logTime":"2026-06-13T14:55:44.604Z"},{"title":"Extend 1 JAM WEEKEND","duration":60,"subtotal":30000,"startTimeFormatted":"22.55","endTimeFormatted":"23.55","logTime":"2026-06-13T14:55:44.605Z"}]	\N	[]	4	4	4	\N	4	2	12	0	0.00	\N	\N	\N	0.00	0.00	2026-06-13 21:55:38.032527	2026-06-14 00:02:37.470492
36	TAB-260612012405	JOKOWI	\N	\N	1	\N	\N	PAID	BILLIARD	open	OPEN TABLE WEEKEND	2026-06-13 01:24:05.888	2026-06-13 03:08:17.552	\N	52500.00	0.00	52500.00	0.00	0.00	0.00	0.00	52500.00	[{"method":"CASH","amount":52500,"payer":"JOKOWI","timestamp":"2026-06-12T20:08:29.292Z","paymentId":33}]	[{"title":"17:00-02:00","date":"13/06/2026","startTimeFormatted":"01.24","duration":36,"cost":18000.000000000004,"isExtension":false,"ratePerHour":30000,"subtotal":18000,"endTimeFormatted":"02.00"},{"title":"02:00-10:00","date":"13/06/2026","startTimeFormatted":"02.00","duration":69,"cost":34500.00000000001,"isExtension":false,"ratePerHour":30000,"subtotal":34500,"endTimeFormatted":"03.09"}]	\N	[]	4	4	4	\N	2	1	11	0	0.00	\N	\N	\N	0.00	0.00	2026-06-13 01:24:05.930009	2026-06-13 03:08:29.292526
26	TAB-260612223633	AGUNG	\N	\N	3	\N	\N	PAID	BILLIARD	open	OPEN TABLE WEEKEND	2026-06-12 22:36:33.828	2026-06-13 03:22:44.137	\N	143500.00	0.00	143500.00	0.00	0.00	0.00	0.00	143500.00	[{"method":"CASH","amount":143500,"payer":"AGUNG","timestamp":"2026-06-12T20:22:51.190Z","paymentId":34}]	[{"title":"17:00-02:00","date":"12/06/2026","startTimeFormatted":"22.36","duration":84,"cost":42000.00000000001,"isExtension":false,"ratePerHour":30000,"subtotal":42000,"endTimeFormatted":"00.00"},{"title":"17:00-02:00","date":"13/06/2026","startTimeFormatted":"00.00","duration":120,"cost":60000.00000000001,"isExtension":false,"ratePerHour":30000,"subtotal":60000,"endTimeFormatted":"02.00"},{"title":"02:00-10:00","date":"13/06/2026","startTimeFormatted":"02.00","duration":83,"cost":41500.00000000001,"isExtension":false,"ratePerHour":30000,"subtotal":41500,"endTimeFormatted":"03.23"}]	\N	[]	4	4	4	\N	2	1	11	0	0.00	\N	\N	\N	0.00	0.00	2026-06-12 22:36:33.868678	2026-06-13 03:22:51.190173
35	TAB-260612010656	Tirta	\N	\N	2	\N	\N	PAID	BILLIARD	prepaid	Custom Session	2026-06-13 01:06:56.229	2026-06-13 01:07:56.229	\N	416.67	0.00	500.00	0.00	0.00	0.00	83.33	500.00	[{"method":"QRIS","amount":500,"payer":"Tirta","timestamp":"2026-06-12T18:07:18.005Z","paymentId":29}]	[{"title":"Custom Session","duration":0,"subtotal":416.67,"isExtension":false,"ratePerHour":0,"startTimeFormatted":"01.06","endTimeFormatted":"01.07"}]	\N	[]	1	1	4	\N	2	1	\N	0	0.00	\N	\N	\N	0.00	0.00	2026-06-13 01:06:56.268099	2026-06-13 01:07:18.00549
28	TAB-260612231108	RIFKY	\N	\N	1	\N	\N	PAID	BILLIARD	open	OPEN TABLE WEEKEND	2026-06-12 23:11:08.199	2026-06-13 01:18:37.921	\N	64000.00	0.00	64000.00	0.00	0.00	0.00	0.00	64000.00	[{"method":"CASH","amount":64000,"payer":"RIFKY","timestamp":"2026-06-12T18:18:50.906Z","paymentId":30}]	[{"title":"17:00-02:00","date":"12/06/2026","startTimeFormatted":"23.11","duration":49,"cost":24500.000000000004,"isExtension":false,"ratePerHour":30000,"subtotal":24500,"endTimeFormatted":"00.00"},{"title":"17:00-02:00","date":"13/06/2026","startTimeFormatted":"00.00","duration":79,"cost":39500.00000000001,"isExtension":false,"ratePerHour":30000,"subtotal":39500,"endTimeFormatted":"01.19"}]	\N	[]	4	4	4	\N	2	1	11	0	0.00	\N	\N	\N	0.00	0.00	2026-06-12 23:11:08.248658	2026-06-13 01:18:50.906415
58	TAB-260613224418	MIKO	\N	\N	9	\N	\N	PAID	BILLIARD	prepaid	1 JAM WEEKEND	2026-06-13 22:44:18.312	2026-06-13 23:44:18.312	\N	35000.00	0.00	35000.00	0.00	0.00	0.00	0.00	35000.00	[{"method":"CASH","amount":35000,"payer":"MIKO","timestamp":"2026-06-13T16:45:42.180Z","paymentId":51}]	[{"title":"1 JAM WEEKEND","duration":60,"subtotal":35000,"isExtension":false,"ratePerHour":35000,"startTimeFormatted":"22.44","endTimeFormatted":"23.44"}]	\N	[]	4	4	4	\N	4	2	15	0	0.00	\N	\N	\N	0.00	0.00	2026-06-13 22:44:18.442761	2026-06-13 23:45:42.180292
33	TAB-260612005920	OKI	\N	\N	5	\N	\N	PAID	BILLIARD	open	OPEN TABLE WEEKEND	2026-06-13 00:59:20.564	2026-06-13 02:11:20.197	\N	36000.00	0.00	36000.00	0.00	0.00	0.00	0.00	36000.00	[{"method":"CASH","amount":36000,"payer":"OKI","timestamp":"2026-06-12T19:13:11.222Z","paymentId":32}]	[{"title":"17:00-02:00","date":"13/06/2026","startTimeFormatted":"00.59","duration":61,"cost":30500.000000000004,"isExtension":false,"ratePerHour":30000,"subtotal":30500,"endTimeFormatted":"02.00"},{"title":"02:00-10:00","date":"13/06/2026","startTimeFormatted":"02.00","duration":11,"cost":5500.000000000001,"isExtension":false,"ratePerHour":30000,"subtotal":5500,"endTimeFormatted":"02.11"}]	\N	[]	4	4	4	\N	2	1	11	0	0.00	\N	\N	\N	0.00	0.00	2026-06-13 00:59:20.611694	2026-06-13 02:13:11.22265
30	TAB-260612232535	EKO	\N	\N	6	\N	\N	PAID	BILLIARD	prepaid	1 JAM WEEKEND	2026-06-12 23:25:35.241	2026-06-13 00:25:35.241	\N	30000.00	0.00	30000.00	0.00	0.00	0.00	0.00	30000.00	[{"method":"CASH","amount":30000,"payer":"EKO","timestamp":"2026-06-12T17:26:06.379Z","paymentId":26}]	[{"title":"1 JAM WEEKEND","duration":60,"subtotal":30000,"isExtension":false,"ratePerHour":30000,"startTimeFormatted":"23.25","endTimeFormatted":"24.25"}]	\N	[]	4	4	4	\N	2	1	12	0	0.00	\N	\N	\N	0.00	0.00	2026-06-12 23:25:35.398463	2026-06-13 00:26:06.379017
34	CAFE-20260613-0002-764	Tirta	\N	\N	\N	2	\N	PAID	CAFE	cafe-only	\N	2026-06-13 01:06:13.599	\N	\N	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	[{"method":"CASH","amount":0,"payer":"Tirta","timestamp":"2026-06-12T20:41:06.342Z","paymentId":36}]	[]	\N	[]	1	1	\N	\N	2	1	\N	0	0.00	\N	\N	\N	0.00	0.00	2026-06-13 01:06:13.553127	2026-06-13 03:41:06.342074
31	TAB-260612233102	RIAN	\N	\N	8	\N	\N	PAID	BILLIARD	prepaid	1 JAM WEEKEND	2026-06-12 23:31:02.063	2026-06-13 00:31:02.063	\N	30000.00	0.00	30000.00	0.00	0.00	0.00	0.00	30000.00	[{"method":"CASH","amount":30000,"payer":"RIAN","timestamp":"2026-06-12T17:31:30.767Z","paymentId":27}]	[{"title":"1 JAM WEEKEND","duration":60,"subtotal":30000,"isExtension":false,"ratePerHour":30000,"startTimeFormatted":"23.31","endTimeFormatted":"24.31"}]	\N	[]	4	4	4	\N	2	1	12	0	0.00	\N	\N	\N	0.00	0.00	2026-06-12 23:31:02.173629	2026-06-13 00:31:30.767578
27	TAB-260612224543	RIAN	\N	\N	4	\N	\N	PAID	BILLIARD	prepaid	1 JAM WEEKEND	2026-06-12 22:45:43.697	2026-06-13 00:45:43.697	\N	60000.00	0.00	60000.00	0.00	0.00	0.00	0.00	60000.00	[{"method":"CASH","amount":60000,"payer":"RIAN","timestamp":"2026-06-12T17:49:09.211Z","paymentId":28}]	[{"title":"1 JAM WEEKEND","duration":0,"subtotal":30000,"isExtension":false,"ratePerHour":0,"logTime":"2026-06-12T15:45:47.485Z"},{"title":"Extend 1 JAM WEEKEND","duration":60,"subtotal":30000,"startTimeFormatted":"23.45","endTimeFormatted":"24.45","logTime":"2026-06-12T15:45:47.485Z"}]	\N	[]	4	4	4	\N	2	1	12	0	0.00	\N	\N	\N	0.00	0.00	2026-06-12 22:45:43.792897	2026-06-13 00:49:09.211886
32	TAB-260612004944	.	\N	\N	4	\N	\N	PAID	BILLIARD	open	OPEN TABLE WEEKEND	2026-06-13 00:49:44.25	2026-06-13 01:49:01.332	\N	30000.00	0.00	30000.00	0.00	0.00	0.00	0.00	30000.00	[{"method":"CASH","amount":30000,"payer":".","timestamp":"2026-06-12T18:49:09.154Z","paymentId":31}]	[{"title":"17:00-02:00","date":"13/06/2026","startTimeFormatted":"00.49","duration":60,"cost":30000.000000000004,"isExtension":false,"ratePerHour":30000,"subtotal":30000,"endTimeFormatted":"01.49"}]	\N	[]	4	4	4	\N	2	1	11	0	0.00	\N	\N	\N	0.00	0.00	2026-06-13 00:49:44.316549	2026-06-13 01:49:09.15486
39	TAB-260613135801	ROBI	\N	\N	5	\N	\N	PAID	BILLIARD	prepaid	1 JAM WEEKEND	2026-06-13 13:58:01.012	2026-06-13 15:58:01.012	\N	40000.00	15000.00	55000.00	0.00	0.00	0.00	0.00	55000.00	[{"method":"CASH","amount":55000,"payer":"ROBI","timestamp":"2026-06-13T09:00:09.700Z","paymentId":39}]	[{"title":"1 JAM WEEKEND","duration":0,"subtotal":20000,"isExtension":false,"ratePerHour":0,"logTime":"2026-06-13T06:58:08.501Z"},{"title":"Extend 1 JAM WEEKEND","duration":60,"subtotal":20000,"startTimeFormatted":"14.58","endTimeFormatted":"15.58","logTime":"2026-06-13T06:58:08.501Z"}]	\N	[]	3	3	3	\N	3	2	12	0	0.00	\N	\N	\N	0.00	0.00	2026-06-13 13:58:01.061867	2026-06-13 16:00:09.700608
42	TAB-260613190904	JOKOWI	\N	\N	1	\N	\N	PAID	BILLIARD	prepaid	3 JAM WEEKEND	2026-06-13 19:09:04.848	2026-06-13 22:09:04.848	\N	85000.00	7000.00	92000.00	0.00	0.00	0.00	0.00	92000.00	[{"method":"CASH","amount":92000,"payer":"JOKOWI","timestamp":"2026-06-13T15:10:52.488Z","paymentId":44}]	[{"title":"3 JAM WEEKEND","duration":180,"subtotal":85000,"isExtension":false,"ratePerHour":85000,"startTimeFormatted":"19.09","endTimeFormatted":"22.09"}]	\N	[]	4	4	4	\N	4	2	13	0	0.00	\N	\N	\N	0.00	0.00	2026-06-13 19:09:04.936531	2026-06-13 22:10:52.488001
44	TAB-260613193351	RIAN	\N	\N	2	\N	\N	PAID	BILLIARD	open	OPEN TABLE WEEKEND	2026-06-13 19:33:51.72	2026-06-13 22:30:57.321	\N	89000.00	16000.00	105000.00	0.00	0.00	0.00	0.00	105000.00	[{"method":"QRIS","amount":105000,"payer":"RIAN","timestamp":"2026-06-13T15:34:59.120Z","paymentId":48}]	[{"title":"17:00-02:00","date":"13/06/2026","startTimeFormatted":"19.33","duration":178,"cost":89000.00000000001,"isExtension":false,"ratePerHour":30000,"subtotal":89000,"endTimeFormatted":"22.31"}]	\N	[]	4	4	4	\N	4	2	11	0	0.00	\N	\N	\N	0.00	0.00	2026-06-13 19:33:51.777353	2026-06-13 22:34:59.120201
43	TAB-260613193003	YUANGGA	\N	\N	12	\N	\N	PAID	BILLIARD	prepaid	3 JAM WEEKEND	2026-06-13 19:30:03.035	2026-06-13 22:30:03.035	\N	130000.00	87000.00	217000.00	0.00	0.00	0.00	0.00	217000.00	[{"method":"QRIS","amount":217000,"payer":"YUANGGA","timestamp":"2026-06-13T15:34:39.683Z","paymentId":47}]	[{"title":"3 JAM WEEKEND","duration":180,"subtotal":130000,"isExtension":false,"ratePerHour":130000,"startTimeFormatted":"19.30","endTimeFormatted":"22.30"}]	\N	[]	4	4	4	\N	4	2	19	0	0.00	\N	\N	\N	0.00	0.00	2026-06-13 19:30:03.091241	2026-06-13 22:34:39.683376
66	TAB-260613023109	SLIMIN	\N	\N	2	\N	\N	PAID	BILLIARD	prepaid	1 JAM WEEKEND	2026-06-14 02:31:09.268	2026-06-14 03:31:09.268	\N	30000.00	0.00	30000.00	0.00	0.00	0.00	0.00	30000.00	[{"method":"CASH","amount":30000,"payer":"SLIMIN","timestamp":"2026-06-13T20:32:05.406Z","paymentId":66}]	[{"title":"1 JAM WEEKEND","duration":60,"subtotal":30000,"isExtension":false,"ratePerHour":30000,"startTimeFormatted":"02.31","endTimeFormatted":"03.31"}]	\N	[]	4	4	4	\N	4	2	12	0	0.00	\N	\N	\N	0.00	0.00	2026-06-14 02:31:09.348545	2026-06-14 03:32:05.406412
40	TAB-260613180509	MR. x	\N	\N	8	\N	\N	PAID	BILLIARD	prepaid	1 JAM WEEKEND	2026-06-13 18:05:09.091	2026-06-13 20:05:09.091	\N	60000.00	12000.00	72000.00	0.00	0.00	0.00	0.00	72000.00	[{"method":"CASH","amount":72000,"payer":"MR. x","timestamp":"2026-06-13T13:07:01.840Z","paymentId":41}]	[{"title":"1 JAM WEEKEND","duration":0,"subtotal":30000,"isExtension":false,"ratePerHour":0,"logTime":"2026-06-13T11:05:17.970Z"},{"title":"Extend 1 JAM WEEKEND","duration":60,"subtotal":30000,"startTimeFormatted":"19.05","endTimeFormatted":"20.05","logTime":"2026-06-13T11:05:17.970Z"}]	\N	[]	4	4	4	\N	4	2	12	0	0.00	\N	\N	\N	0.00	0.00	2026-06-13 18:05:09.141729	2026-06-13 20:07:01.840413
52	TAB-260613214427	ADIT	\N	\N	10	\N	\N	PAID	BILLIARD	open	OPEN TABLE WEEKEND	2026-06-13 21:44:27.58	2026-06-13 23:35:51.764	\N	65333.00	21000.00	86400.00	0.00	0.00	0.00	67.00	86400.00	[{"method":"CASH","amount":86400,"payer":"ADIT","timestamp":"2026-06-13T16:39:54.297Z","paymentId":50}]	[{"title":"17:00-02:00","date":"13/06/2026","startTimeFormatted":"21.44","duration":112,"cost":65333.33333333344,"isExtension":false,"ratePerHour":35000,"subtotal":65333,"endTimeFormatted":"23.36"}]	\N	[]	4	4	4	\N	4	2	14	0	0.00	\N	\N	\N	0.00	0.00	2026-06-13 21:44:27.683874	2026-06-13 23:39:54.297465
47	TAB-260613202550	NGOPEK	\N	\N	6	\N	\N	PAID	BILLIARD	prepaid	1 JAM WEEKEND	2026-06-13 20:25:50.387	2026-06-13 22:25:50.387	\N	60000.00	32000.00	92000.00	0.00	0.00	0.00	0.00	92000.00	[{"method":"CASH","amount":92000,"payer":"NGOPEK","timestamp":"2026-06-13T15:27:21.252Z","paymentId":45}]	[{"title":"1 JAM WEEKEND","duration":0,"subtotal":30000,"isExtension":false,"ratePerHour":0,"logTime":"2026-06-13T13:25:56.392Z"},{"title":"Extend 1 JAM WEEKEND","duration":60,"subtotal":30000,"startTimeFormatted":"21.25","endTimeFormatted":"22.25","logTime":"2026-06-13T13:25:56.392Z"}]	\N	[]	4	4	4	\N	4	2	12	0	0.00	\N	\N	\N	0.00	0.00	2026-06-13 20:25:50.428328	2026-06-13 22:27:21.252641
51	TAB-260613213846	OBI	\N	\N	9	\N	\N	PAID	BILLIARD	open	OPEN TABLE WEEKEND	2026-06-13 21:38:46.028	2026-06-13 22:32:04.285	\N	35000.00	60000.00	95000.00	0.00	0.00	0.00	0.00	95000.00	[{"method":"QRIS","amount":95000,"payer":"OBI","timestamp":"2026-06-13T15:33:14.958Z","paymentId":46}]	[{"title":"17:00-02:00","date":"13/06/2026","startTimeFormatted":"21.38","duration":60,"cost":34999.99999999998,"isExtension":false,"ratePerHour":35000,"subtotal":35000,"endTimeFormatted":"22.38"}]	\N	[]	4	4	4	\N	4	2	14	0	0.00	\N	\N	\N	0.00	0.00	2026-06-13 21:38:46.081545	2026-06-13 22:33:14.958922
113	CAFE-20260615-0002-648	.	\N	\N	\N	1	\N	PAID	CAFE	cafe-only	\N	2026-06-15 14:53:08.132	\N	\N	0.00	12000.00	12000.00	0.00	0.00	0.00	0.00	12000.00	[{"method":"CASH","amount":12000,"payer":".","timestamp":"2026-06-15T07:53:30.884Z","paymentId":111}]	[]	\N	[]	4	4	\N	\N	7	4	\N	0	0.00	\N	\N	\N	0.00	0.00	2026-06-15 14:53:08.106279	2026-06-15 14:53:30.884212
41	TAB-260613182118	YOGA	\N	\N	4	\N	\N	PAID	BILLIARD	prepaid	1 JAM WEEKEND	2026-06-13 18:21:18.787	2026-06-13 19:21:18.787	\N	30000.00	6000.00	36000.00	0.00	0.00	0.00	0.00	36000.00	[{"method":"QRIS","amount":36000,"payer":"YOGA","timestamp":"2026-06-13T12:22:31.285Z","paymentId":40}]	[{"title":"1 JAM WEEKEND","duration":60,"subtotal":30000,"isExtension":false,"ratePerHour":30000,"startTimeFormatted":"18.21","endTimeFormatted":"19.21"}]	\N	[]	4	4	4	\N	4	2	12	0	0.00	\N	\N	\N	0.00	0.00	2026-06-13 18:21:18.911819	2026-06-13 19:22:31.285685
61	TAB-260613000301	AGUNG	\N	\N	5	\N	\N	PAID	BILLIARD	open	OPEN TABLE WEEKEND	2026-06-14 00:03:01.642	2026-06-14 02:21:50.884	\N	69500.00	25000.00	94500.00	0.00	0.00	0.00	0.00	94500.00	[{"method":"CASH","amount":94500,"payer":"AGUNG","timestamp":"2026-06-13T19:22:11.658Z","paymentId":62}]	[{"title":"17:00-02:00","date":"14/06/2026","startTimeFormatted":"00.03","duration":117,"cost":58500.00000000001,"isExtension":false,"ratePerHour":30000,"subtotal":58500,"endTimeFormatted":"02.00"},{"title":"02:00-10:00","date":"14/06/2026","startTimeFormatted":"02.00","duration":22,"cost":11000.000000000002,"isExtension":false,"ratePerHour":30000,"subtotal":11000,"endTimeFormatted":"02.22"}]	\N	[]	4	4	4	\N	4	2	11	0	0.00	\N	\N	\N	0.00	0.00	2026-06-14 00:03:01.700327	2026-06-14 02:22:11.658321
67	TAB-260614101111	YURO	\N	\N	5	\N	\N	PAID	BILLIARD	prepaid	1 JAM WEEKEND	2026-06-14 10:11:11.186	2026-06-14 11:11:11.186	\N	20000.00	0.00	20000.00	0.00	0.00	0.00	0.00	20000.00	[{"method":"CASH","amount":20000,"payer":"YURO","timestamp":"2026-06-14T04:11:50.914Z","paymentId":68}]	[{"title":"1 JAM WEEKEND","duration":60,"subtotal":20000,"isExtension":false,"ratePerHour":20000,"startTimeFormatted":"10.11","endTimeFormatted":"11.11"}]	\N	[]	3	3	3	\N	5	3	12	0	0.00	\N	\N	\N	0.00	0.00	2026-06-14 10:11:11.23618	2026-06-14 11:11:50.914018
45	TAB-260613194620	LEONARDO	\N	\N	5	\N	\N	PAID	BILLIARD	prepaid	1 JAM WEEKEND	2026-06-13 19:46:20.417	2026-06-13 21:46:20.417	\N	60000.00	6000.00	66000.00	0.00	0.00	0.00	0.00	66000.00	[{"method":"CASH","amount":66000,"payer":"LEONARDO","timestamp":"2026-06-13T14:47:40.657Z","paymentId":42}]	[{"title":"1 JAM WEEKEND","duration":0,"subtotal":30000,"isExtension":false,"ratePerHour":0,"logTime":"2026-06-13T12:46:27.313Z"},{"title":"Extend 1 JAM WEEKEND","duration":60,"subtotal":30000,"startTimeFormatted":"20.46","endTimeFormatted":"21.46","logTime":"2026-06-13T12:46:27.313Z"}]	\N	[]	4	4	4	\N	4	2	12	0	0.00	\N	\N	\N	0.00	0.00	2026-06-13 19:46:20.478018	2026-06-13 21:47:40.657069
46	TAB-260613200046	KAKA	\N	\N	4	\N	\N	PAID	BILLIARD	prepaid	1 JAM WEEKEND	2026-06-13 20:00:46.166	2026-06-13 22:00:46.166	\N	60000.00	12000.00	72000.00	0.00	0.00	0.00	0.00	72000.00	[{"method":"CASH","amount":72000,"payer":"KAKA","timestamp":"2026-06-13T15:03:02.809Z","paymentId":43}]	[{"title":"1 JAM WEEKEND","duration":0,"subtotal":30000,"isExtension":false,"ratePerHour":0,"logTime":"2026-06-13T13:01:01.623Z"},{"title":"Extend 1 JAM WEEKEND","duration":60,"subtotal":30000,"startTimeFormatted":"21.00","endTimeFormatted":"22.00","logTime":"2026-06-13T13:01:01.623Z"}]	\N	[]	4	4	4	\N	4	2	12	0	0.00	\N	\N	\N	0.00	0.00	2026-06-13 20:00:46.213435	2026-06-13 22:03:02.809574
55	TAB-260613221136	AMAR	\N	\N	1	\N	\N	PAID	BILLIARD	prepaid	3 JAM WEEKEND	2026-06-13 22:11:36.916	2026-06-14 01:11:36.916	\N	85000.00	74000.00	159000.00	0.00	0.00	0.00	0.00	159000.00	[{"method":"CASH","amount":159000,"payer":"AMAR","timestamp":"2026-06-13T18:12:41.346Z","paymentId":60}]	[{"title":"3 JAM WEEKEND","duration":180,"subtotal":85000,"isExtension":false,"ratePerHour":85000,"startTimeFormatted":"22.11","endTimeFormatted":"01.11"}]	\N	[]	4	4	4	\N	4	2	13	0	0.00	\N	\N	\N	0.00	0.00	2026-06-13 22:11:36.97284	2026-06-14 01:12:41.346446
65	TAB-260613014355	TATANG	\N	\N	5	\N	\N	PAID	BILLIARD	open	OPEN TABLE WEEKEND	2026-06-14 01:43:55.302	2026-06-14 04:31:10.651	\N	84000.00	30000.00	114000.00	0.00	0.00	0.00	0.00	114000.00	[{"method":"CASH","amount":114000,"payer":"TATANG","timestamp":"2026-06-13T21:31:31.242Z","paymentId":67}]	[{"title":"17:00-02:00","date":"14/06/2026","startTimeFormatted":"01.43","duration":17,"cost":8500.000000000002,"isExtension":false,"ratePerHour":30000,"subtotal":8500,"endTimeFormatted":"02.00"},{"title":"02:00-10:00","date":"14/06/2026","startTimeFormatted":"02.00","duration":151,"cost":75500.00000000001,"isExtension":false,"ratePerHour":30000,"subtotal":75500,"endTimeFormatted":"04.31"}]	\N	[]	4	4	4	\N	4	2	11	0	0.00	\N	\N	\N	0.00	0.00	2026-06-14 01:43:55.358891	2026-06-14 04:31:31.24232
59	TAB-260613225323	BAYU	\N	\N	11	\N	\N	PAID	BILLIARD	open	OPEN TABLE WEEKEND	2026-06-13 22:53:23.23	2026-06-14 01:07:47.321	\N	101250.00	67000.00	168300.00	0.00	0.00	0.00	50.00	268300.00	[{"method":"CASH","amount":100000,"payer":"Payer 1","timestamp":"2026-06-13T18:08:52.335Z","paymentId":58},{"method":"QRIS","amount":168300,"payer":"BAYU","timestamp":"2026-06-13T18:09:24.231Z","paymentId":59}]	[{"title":"17:00-02:00","date":"13/06/2026","startTimeFormatted":"22.53","duration":67,"cost":50250,"isExtension":false,"ratePerHour":45000,"subtotal":50250,"endTimeFormatted":"00.00"},{"title":"17:00-02:00","date":"14/06/2026","startTimeFormatted":"00.00","duration":68,"cost":51000,"isExtension":false,"ratePerHour":45000,"subtotal":51000,"endTimeFormatted":"01.08"}]	\N	[]	4	4	4	4	4	2	17	0	0.00	\N	\N	\N	0.00	0.00	2026-06-13 22:53:23.277833	2026-06-14 01:09:24.231676
49	TAB-260613210821	SATRIYA	\N	\N	8	\N	\N	PAID	BILLIARD	prepaid	1 JAM WEEKEND	2026-06-13 21:08:21.532	2026-06-13 23:08:21.532	\N	60000.00	10000.00	70000.00	0.00	0.00	0.00	0.00	70000.00	[{"method":"CASH","amount":70000,"payer":"SATRIYA","timestamp":"2026-06-13T16:10:01.418Z","paymentId":49}]	[{"title":"1 JAM WEEKEND","duration":0,"subtotal":30000,"isExtension":false,"ratePerHour":0,"logTime":"2026-06-13T14:08:24.902Z"},{"title":"Extend 1 JAM WEEKEND","duration":60,"subtotal":30000,"startTimeFormatted":"22.08","endTimeFormatted":"23.08","logTime":"2026-06-13T14:08:24.902Z"}]	\N	[]	4	4	4	\N	4	2	12	0	0.00	\N	\N	\N	0.00	0.00	2026-06-13 21:08:21.581552	2026-06-13 23:10:01.418163
64	TAB-260613013150	?	\N	\N	2	\N	\N	PAID	BILLIARD	open	OPEN TABLE WEEKEND	2026-06-14 01:31:50.294	2026-06-14 02:18:46.437	\N	30000.00	0.00	30000.00	0.00	0.00	0.00	0.00	30000.00	[{"method":"CASH","amount":30000,"payer":"?","timestamp":"2026-06-13T19:18:54.487Z","paymentId":61}]	[{"title":"17:00-02:00","date":"14/06/2026","startTimeFormatted":"01.31","duration":29,"cost":14500.000000000002,"isExtension":false,"ratePerHour":30000,"subtotal":14500,"endTimeFormatted":"02.00"},{"title":"02:00-10:00","date":"14/06/2026","startTimeFormatted":"02.00","duration":31,"cost":15500.000000000002,"isExtension":false,"ratePerHour":30000,"subtotal":15500,"endTimeFormatted":"02.31"}]	\N	[]	4	4	4	\N	4	2	11	0	0.00	\N	\N	\N	0.00	0.00	2026-06-14 01:31:50.390486	2026-06-14 02:18:54.487693
50	TAB-260613211621	AWAN	\N	\N	7	\N	\N	PAID	BILLIARD	open	OPEN TABLE WEEKEND	2026-06-13 21:16:21.016	2026-06-14 00:05:22.102	\N	85000.00	18000.00	103000.00	0.00	0.00	0.00	0.00	103000.00	[{"method":"QRIS","amount":103000,"payer":"AWAN","timestamp":"2026-06-13T17:05:45.343Z","paymentId":53}]	[{"title":"17:00-02:00","date":"13/06/2026","startTimeFormatted":"21.16","duration":164,"cost":82000.00000000001,"isExtension":false,"ratePerHour":30000,"subtotal":82000,"endTimeFormatted":"00.00"},{"title":"17:00-02:00","date":"14/06/2026","startTimeFormatted":"00.00","duration":6,"cost":3000.0000000000005,"isExtension":false,"ratePerHour":30000,"subtotal":3000,"endTimeFormatted":"00.06"}]	\N	[]	4	4	4	\N	4	2	11	0	0.00	\N	\N	\N	0.00	0.00	2026-06-13 21:16:21.063374	2026-06-14 00:05:45.343902
105	TAB-260615101917	. 	\N	\N	2	\N	\N	PAID	BILLIARD	prepaid	2 JAM WEEKDAYS	2026-06-15 10:19:17.458	2026-06-15 12:19:17.458	\N	35000.00	14000.00	49000.00	0.00	0.00	0.00	0.00	49000.00	[{"method":"CASH","amount":49000,"payer":". ","timestamp":"2026-06-15T05:19:44.015Z","paymentId":106}]	[{"title":"2 JAM WEEKDAYS","duration":120,"subtotal":35000,"isExtension":false,"ratePerHour":35000,"startTimeFormatted":"10.19","endTimeFormatted":"12.19"}]	\N	[]	5	5	5	\N	\N	4	7	0	0.00	\N	\N	\N	0.00	0.00	2026-06-15 10:19:17.552337	2026-06-15 12:19:44.015087
54	TAB-260613220439	CAHYO	\N	\N	4	\N	\N	PAID	BILLIARD	prepaid	3 JAM WEEKEND	2026-06-13 22:04:39.412	2026-06-14 01:04:39.412	\N	85000.00	30000.00	115000.00	0.00	0.00	0.00	0.00	115000.00	[{"method":"QRIS","amount":115000,"payer":"CAHYO","timestamp":"2026-06-13T18:06:54.959Z","paymentId":57}]	[{"title":"3 JAM WEEKEND","duration":180,"subtotal":85000,"isExtension":false,"ratePerHour":85000,"startTimeFormatted":"22.04","endTimeFormatted":"01.04"}]	\N	[]	4	4	4	\N	4	2	13	0	0.00	\N	\N	\N	0.00	0.00	2026-06-13 22:04:39.46012	2026-06-14 01:06:54.959454
56	TAB-260613222912	NOPUL	\N	\N	6	\N	\N	PAID	BILLIARD	prepaid	1 JAM WEEKEND	2026-06-13 22:29:12.358	2026-06-14 00:29:12.358	\N	60000.00	12000.00	72000.00	0.00	0.00	0.00	0.00	72000.00	[{"method":"CASH","amount":72000,"payer":"NOPUL","timestamp":"2026-06-13T17:33:16.264Z","paymentId":56}]	[{"title":"1 JAM WEEKEND","duration":0,"subtotal":30000,"isExtension":false,"ratePerHour":0,"logTime":"2026-06-13T15:29:16.995Z"},{"title":"Extend 1 JAM WEEKEND","duration":60,"subtotal":30000,"startTimeFormatted":"23.29","endTimeFormatted":"24.29","logTime":"2026-06-13T15:29:16.995Z"}]	\N	[]	4	4	4	\N	4	2	12	0	0.00	\N	\N	\N	0.00	0.00	2026-06-13 22:29:12.406516	2026-06-14 00:33:16.264752
69	TAB-260614115126	SLIM	\N	\N	2	\N	\N	PAID	BILLIARD	prepaid	1 JAM WEEKEND	2026-06-14 11:51:26.064	2026-06-14 12:51:26.064	\N	20000.00	0.00	20000.00	0.00	0.00	0.00	0.00	20000.00	[{"method":"CASH","amount":20000,"payer":"SLIM","timestamp":"2026-06-14T05:55:22.599Z","paymentId":70}]	[{"title":"1 JAM WEEKEND","duration":60,"subtotal":20000,"isExtension":false,"ratePerHour":20000,"startTimeFormatted":"11.51","endTimeFormatted":"12.51"}]	\N	[]	3	3	3	\N	5	3	12	0	0.00	\N	\N	\N	0.00	0.00	2026-06-14 11:51:26.112971	2026-06-14 12:55:22.599879
68	TAB-260614103058	ANDI	\N	\N	2	\N	\N	PAID	BILLIARD	prepaid	1 JAM WEEKEND	2026-06-14 10:30:58.959	2026-06-14 11:30:58.959	\N	20000.00	0.00	20000.00	0.00	0.00	0.00	0.00	20000.00	[{"method":"CASH","amount":20000,"payer":"ANDI","timestamp":"2026-06-14T04:31:37.328Z","paymentId":69}]	[{"title":"1 JAM WEEKEND","duration":60,"subtotal":20000,"isExtension":false,"ratePerHour":20000,"startTimeFormatted":"10.30","endTimeFormatted":"11.30"}]	\N	[]	3	3	3	\N	5	3	12	0	0.00	\N	\N	\N	0.00	0.00	2026-06-14 10:30:59.014163	2026-06-14 11:31:37.328929
71	TAB-260614125105	ABI	\N	\N	5	\N	\N	PAID	BILLIARD	prepaid	1 JAM WEEKEND	2026-06-14 12:51:05.314	2026-06-14 13:51:05.314	\N	20000.00	0.00	20000.00	0.00	0.00	0.00	0.00	20000.00	[{"method":"QRIS","amount":20000,"payer":"ABI","timestamp":"2026-06-14T06:51:48.316Z","paymentId":71}]	[{"title":"1 JAM WEEKEND","duration":60,"subtotal":20000,"isExtension":false,"ratePerHour":20000,"startTimeFormatted":"12.51","endTimeFormatted":"13.51"}]	\N	[]	3	3	3	\N	5	3	12	0	0.00	\N	\N	\N	0.00	0.00	2026-06-14 12:51:05.367167	2026-06-14 13:51:48.316442
63	TAB-260613011314	AMAR	\N	\N	1	\N	\N	PAID	BILLIARD	open	OPEN TABLE WEEKEND	2026-06-14 01:13:13.943	2026-06-14 02:37:22.223	\N	42500.00	0.00	42500.00	0.00	0.00	0.00	0.00	42500.00	[{"method":"CASH","amount":42500,"payer":"AMAR","timestamp":"2026-06-13T19:37:30.460Z","paymentId":63}]	[{"title":"17:00-02:00","date":"14/06/2026","startTimeFormatted":"01.13","duration":47,"cost":23500.000000000004,"isExtension":false,"ratePerHour":30000,"subtotal":23500,"endTimeFormatted":"02.00"},{"title":"02:00-10:00","date":"14/06/2026","startTimeFormatted":"02.00","duration":38,"cost":19000.000000000004,"isExtension":false,"ratePerHour":30000,"subtotal":19000,"endTimeFormatted":"02.38"}]	\N	[]	4	4	4	\N	4	2	11	0	0.00	\N	\N	\N	0.00	0.00	2026-06-14 01:13:14.045183	2026-06-14 02:37:30.460906
57	TAB-260613223753	AGUNG	\N	\N	3	\N	\N	PAID	BILLIARD	open	OPEN TABLE WEEKEND	2026-06-13 22:37:53.227	2026-06-14 02:56:34.95	\N	129500.00	30000.00	159500.00	0.00	0.00	0.00	0.00	159500.00	[{"method":"CASH","amount":159500,"payer":"AGUNG","timestamp":"2026-06-13T19:56:51.477Z","paymentId":64}]	[{"title":"17:00-02:00","date":"13/06/2026","startTimeFormatted":"22.37","duration":83,"cost":41500.00000000001,"isExtension":false,"ratePerHour":30000,"subtotal":41500,"endTimeFormatted":"00.00"},{"title":"17:00-02:00","date":"14/06/2026","startTimeFormatted":"00.00","duration":120,"cost":60000.00000000001,"isExtension":false,"ratePerHour":30000,"subtotal":60000,"endTimeFormatted":"02.00"},{"title":"02:00-10:00","date":"14/06/2026","startTimeFormatted":"02.00","duration":56,"cost":28000.000000000004,"isExtension":false,"ratePerHour":30000,"subtotal":28000,"endTimeFormatted":"02.56"}]	\N	[]	4	4	4	\N	4	2	11	0	0.00	\N	\N	\N	0.00	0.00	2026-06-13 22:37:53.291464	2026-06-14 02:56:51.47702
62	TAB-260613004253	VOL	\N	\N	7	\N	\N	PAID	BILLIARD	open	OPEN TABLE WEEKEND	2026-06-14 00:42:53.573	2026-06-14 03:07:55.408	\N	73000.00	17000.00	90000.00	0.00	0.00	0.00	0.00	90000.00	[{"method":"CASH","amount":90000,"payer":"VOL","timestamp":"2026-06-13T20:08:09.496Z","paymentId":65}]	[{"title":"17:00-02:00","date":"14/06/2026","startTimeFormatted":"00.42","duration":78,"cost":39000.00000000001,"isExtension":false,"ratePerHour":30000,"subtotal":39000,"endTimeFormatted":"02.00"},{"title":"02:00-10:00","date":"14/06/2026","startTimeFormatted":"02.00","duration":68,"cost":34000.00000000001,"isExtension":false,"ratePerHour":30000,"subtotal":34000,"endTimeFormatted":"03.08"}]	\N	[]	4	4	4	\N	4	2	11	0	0.00	\N	\N	\N	0.00	0.00	2026-06-14 00:42:53.633104	2026-06-14 03:08:09.496918
90	TAB-260614204046	SIBI	\N	\N	8	\N	\N	PAID	BILLIARD	prepaid	1 JAM WEEKEND	2026-06-14 20:40:46.303	2026-06-14 22:40:46.303	\N	60000.00	0.00	60000.00	0.00	0.00	0.00	0.00	60000.00	[{"method":"CASH","amount":60000,"payer":"SIBI","timestamp":"2026-06-14T15:41:58.997Z","paymentId":91}]	[{"title":"1 JAM WEEKEND","duration":0,"subtotal":30000,"isExtension":false,"ratePerHour":0,"logTime":"2026-06-14T13:40:52.228Z"},{"title":"Extend 1 JAM WEEKEND","duration":60,"subtotal":30000,"startTimeFormatted":"21.40","endTimeFormatted":"22.40","logTime":"2026-06-14T13:40:52.228Z"}]	\N	[]	4	4	4	\N	6	3	12	0	0.00	\N	\N	\N	0.00	0.00	2026-06-14 20:40:46.355881	2026-06-14 22:41:58.997753
102	TAB-260614004905	jon	\N	\N	4	\N	\N	PAID	BILLIARD	prepaid	Custom Session	2026-06-15 00:49:05.546	2026-06-15 03:19:05.546	\N	75000.00	0.00	75000.00	0.00	0.00	0.00	0.00	75000.00	[{"method":"CASH","amount":75000,"payer":"jon","timestamp":"2026-06-14T19:38:34.537Z","paymentId":103}]	[{"title":"Custom Session","duration":0,"subtotal":45000,"isExtension":false,"ratePerHour":0,"logTime":"2026-06-14T19:14:49.619Z"},{"title":"Tambahan Waktu","duration":60,"subtotal":30000,"startTimeFormatted":"02.19","endTimeFormatted":"03.19","logTime":"2026-06-14T19:14:49.619Z"}]	\N	[]	4	4	4	\N	6	3	\N	0	0.00	\N	\N	\N	0.00	0.00	2026-06-15 00:49:05.637039	2026-06-15 02:38:34.5371
86	TAB-260614190002	REZA	\N	\N	5	\N	\N	PAID	BILLIARD	prepaid	1 JAM WEEKEND	2026-06-14 19:00:02.113	2026-06-14 21:00:02.113	\N	60000.00	18000.00	78000.00	0.00	0.00	0.00	0.00	100000.00	[{"method":"CASH","amount":100000,"payer":"REZA","timestamp":"2026-06-14T14:00:50.242Z","paymentId":85}]	[{"title":"1 JAM WEEKEND","duration":0,"subtotal":30000,"isExtension":false,"ratePerHour":0,"logTime":"2026-06-14T12:00:14.142Z"},{"title":"Extend 1 JAM WEEKEND","duration":60,"subtotal":30000,"startTimeFormatted":"20.00","endTimeFormatted":"21.00","logTime":"2026-06-14T12:00:14.142Z"}]	\N	[]	4	4	4	\N	6	3	12	0	0.00	\N	\N	\N	0.00	0.00	2026-06-14 19:00:02.157662	2026-06-14 21:00:50.242337
98	TAB-260614230515	JON	\N	\N	4	\N	\N	PAID	BILLIARD	prepaid	1 JAM WEEKEND	2026-06-14 23:05:15.9	2026-06-15 01:05:15.9	\N	60000.00	15000.00	75000.00	0.00	0.00	0.00	0.00	75000.00	[{"method":"CASH","amount":75000,"payer":"JON","timestamp":"2026-06-14T17:47:02.823Z","paymentId":99}]	[{"title":"1 JAM WEEKEND","duration":0,"subtotal":30000,"isExtension":false,"ratePerHour":0,"logTime":"2026-06-14T16:05:26.726Z"},{"title":"Extend 1 JAM WEEKEND","duration":60,"subtotal":30000,"startTimeFormatted":"24.05","endTimeFormatted":"01.05","logTime":"2026-06-14T16:05:26.726Z"}]	\N	[]	4	4	4	\N	6	3	12	0	0.00	\N	\N	\N	0.00	0.00	2026-06-14 23:05:15.952265	2026-06-15 00:47:02.823051
93	TAB-260614220019	ATTA	\N	\N	2	\N	\N	PAID	BILLIARD	open	OPEN TABLE WEEKEND	2026-06-14 22:00:19.167	2026-06-15 00:26:25.562	\N	73500.00	10000.00	83500.00	0.00	0.00	0.00	0.00	83500.00	[{"method":"CASH","amount":83500,"payer":"ATTA","timestamp":"2026-06-14T17:28:08.257Z","paymentId":96}]	[{"title":"17:00-02:00","date":"14/06/2026","startTimeFormatted":"22.00","duration":120,"cost":60000.00000000001,"isExtension":false,"ratePerHour":30000,"subtotal":60000,"endTimeFormatted":"00.00"},{"title":"17:00-02:00","date":"15/06/2026","startTimeFormatted":"00.00","duration":27,"cost":13500.000000000002,"isExtension":false,"ratePerHour":30000,"subtotal":13500,"endTimeFormatted":"00.27"}]	\N	[]	4	4	4	\N	6	3	11	0	0.00	\N	\N	\N	0.00	0.00	2026-06-14 22:00:19.273504	2026-06-15 00:28:08.257129
103	TAB-260614011344	jokowi	\N	\N	1	\N	\N	PAID	BILLIARD	prepaid	Custom Session	2026-06-15 01:13:44.695	2026-06-15 04:13:44.695	\N	90000.00	0.00	90000.00	0.00	0.00	0.00	0.00	90000.00	[{"method":"QRIS","amount":90000,"payer":"jokowi","timestamp":"2026-06-14T21:12:52.773Z","paymentId":104}]	[{"title":"Custom Session","duration":177,"subtotal":90000,"isExtension":false,"ratePerHour":0,"startTimeFormatted":"01.13","endTimeFormatted":"04.10"}]	\N	[]	4	4	4	\N	6	3	\N	0	0.00	\N	\N	\N	0.00	0.00	2026-06-15 01:13:44.759932	2026-06-15 04:12:52.773376
134	TAB-260616110403	RAFLI	\N	\N	11	\N	\N	PAID	BILLIARD	prepaid	3 JAM WEEKEND	2026-06-16 11:04:03.047	2026-06-16 14:04:03.047	\N	100000.00	21000.00	121000.00	0.00	0.00	0.00	0.00	121000.00	[{"method":"CASH","amount":121000,"payer":"RAFLI","timestamp":"2026-06-16T07:07:03.301Z","paymentId":136}]	[{"title":"3 JAM WEEKEND","duration":180,"subtotal":100000,"isExtension":false,"ratePerHour":100000,"startTimeFormatted":"11.04","endTimeFormatted":"14.04"}]	\N	[]	3	3	3	\N	9	7	19	0	0.00	\N	\N	\N	0.00	0.00	2026-06-16 11:04:03.092432	2026-06-16 14:07:03.301473
107	TAB-260615113219	SLIMIN	\N	\N	3	\N	\N	PAID	BILLIARD	prepaid	1 JAM WEEKDAYS	2026-06-15 11:32:19.277	2026-06-15 12:32:19.277	\N	20000.00	0.00	20000.00	0.00	0.00	0.00	0.00	20000.00	[{"method":"CASH","amount":20000,"payer":"SLIMIN","timestamp":"2026-06-15T05:36:04.290Z","paymentId":107}]	[{"title":"1 JAM WEEKDAYS","duration":60,"subtotal":20000,"isExtension":false,"ratePerHour":20000,"startTimeFormatted":"11.32","endTimeFormatted":"12.32"}]	\N	[]	4	4	4	\N	7	4	6	0	0.00	\N	\N	\N	0.00	0.00	2026-06-15 11:32:19.323028	2026-06-15 12:36:04.290431
120	TAB-260615193940	RICKY	\N	\N	8	\N	\N	PAID	BILLIARD	prepaid	1 JAM WEEKDAYS	2026-06-15 19:39:40.258	2026-06-15 21:39:40.258	\N	50000.00	48000.00	98000.00	0.00	0.00	0.00	0.00	100000.00	[{"method":"CASH","amount":100000,"payer":"RICKY","timestamp":"2026-06-15T14:47:17.318Z","paymentId":121}]	[{"title":"1 JAM WEEKDAYS","duration":0,"subtotal":25000,"isExtension":false,"ratePerHour":0,"logTime":"2026-06-15T12:39:51.518Z"},{"title":"Extend 1 JAM WEEKDAYS","duration":60,"subtotal":25000,"startTimeFormatted":"20.39","endTimeFormatted":"21.39","logTime":"2026-06-15T12:39:51.518Z"}]	\N	[]	4	4	4	\N	8	4	6	0	0.00	\N	\N	\N	0.00	0.00	2026-06-15 19:39:40.299216	2026-06-15 21:47:17.318482
100	TAB-260614001912	nopal	\N	\N	3	\N	\N	PAID	BILLIARD	prepaid	Custom Session	2026-06-15 00:19:12.485	2026-06-15 01:19:12.485	\N	30000.00	0.00	30000.00	0.00	0.00	0.00	0.00	30000.00	[{"method":"CASH","amount":30000,"payer":"nopal","timestamp":"2026-06-14T18:20:48.869Z","paymentId":100}]	[{"title":"Custom Session","duration":60,"subtotal":30000,"isExtension":false,"ratePerHour":0,"startTimeFormatted":"24.19","endTimeFormatted":"01.19"}]	\N	[]	4	4	4	\N	6	3	\N	0	0.00	\N	\N	\N	0.00	0.00	2026-06-15 00:19:12.538013	2026-06-15 01:20:48.869806
72	TAB-260614132204	BIMA	\N	\N	2	\N	\N	PAID	BILLIARD	prepaid	1 JAM WEEKEND	2026-06-14 13:22:04.298	2026-06-14 15:22:04.298	\N	40000.00	17000.00	57000.00	0.00	0.00	0.00	0.00	57000.00	[{"method":"CASH","amount":57000,"payer":"BIMA","timestamp":"2026-06-14T08:23:14.505Z","paymentId":72}]	[{"title":"1 JAM WEEKEND","duration":0,"subtotal":20000,"isExtension":false,"ratePerHour":0,"logTime":"2026-06-14T06:22:14.718Z"},{"title":"Extend 1 JAM WEEKEND","duration":60,"subtotal":20000,"startTimeFormatted":"14.22","endTimeFormatted":"15.22","logTime":"2026-06-14T06:22:14.718Z"}]	\N	[]	3	3	3	\N	5	3	12	0	0.00	\N	\N	\N	0.00	0.00	2026-06-14 13:22:04.349212	2026-06-14 15:23:14.505004
97	TAB-260614230202	?	\N	\N	12	\N	\N	PAID	BILLIARD	prepaid	1 JAM WEEKEND 	2026-06-14 23:02:02.6	2026-06-15 00:02:02.6	\N	45000.00	25000.00	70000.00	0.00	0.00	0.00	0.00	70000.00	[{"method":"CASH","amount":70000,"payer":"?","timestamp":"2026-06-14T17:04:26.963Z","paymentId":95}]	[{"title":"1 JAM WEEKEND ","duration":60,"subtotal":45000,"isExtension":false,"ratePerHour":45000,"startTimeFormatted":"23.02","endTimeFormatted":"24.02"}]	\N	[]	4	4	4	\N	6	3	21	0	0.00	\N	\N	\N	0.00	0.00	2026-06-14 23:02:02.638736	2026-06-15 00:04:26.963423
109	TAB-260615124351	LANA	\N	\N	3	\N	\N	PAID	BILLIARD	prepaid	2 JAM WEEKDAYS	2026-06-15 12:43:51.941	2026-06-15 14:43:51.941	\N	35000.00	0.00	35000.00	0.00	0.00	0.00	0.00	35000.00	[{"method":"CASH","amount":35000,"payer":"LANA","timestamp":"2026-06-15T07:52:28.156Z","paymentId":110}]	[{"title":"2 JAM WEEKDAYS","duration":120,"subtotal":35000,"isExtension":false,"ratePerHour":35000,"startTimeFormatted":"12.43","endTimeFormatted":"14.43"}]	\N	[]	4	4	4	\N	7	4	7	0	0.00	\N	\N	\N	0.00	0.00	2026-06-15 12:43:51.977939	2026-06-15 14:52:28.156854
111	TAB-260615134915	INDRA	\N	\N	5	\N	\N	PAID	BILLIARD	prepaid	3 JAM WEEKDAYS	2026-06-15 13:49:15.529	2026-06-15 16:49:15.529	\N	53000.00	14000.00	67000.00	0.00	0.00	0.00	0.00	67000.00	[{"method":"CASH","amount":67000,"payer":"INDRA","timestamp":"2026-06-15T09:49:56.718Z","paymentId":112}]	[{"title":"3 JAM WEEKDAYS","duration":180,"subtotal":53000,"isExtension":false,"ratePerHour":53000,"startTimeFormatted":"13.49","endTimeFormatted":"16.49"}]	\N	[]	4	4	4	\N	7	4	8	0	0.00	\N	\N	\N	0.00	0.00	2026-06-15 13:49:15.577337	2026-06-15 16:49:56.718504
115	TAB-260615160453	ARTA	\N	\N	6	\N	\N	PAID	BILLIARD	prepaid	2 JAM WEEKDAYS	2026-06-15 16:04:53.439	2026-06-15 18:04:53.439	\N	35000.00	15000.00	50000.00	0.00	0.00	0.00	0.00	50000.00	[{"method":"CASH","amount":50000,"payer":"ARTA","timestamp":"2026-06-15T11:36:43.943Z","paymentId":116}]	[{"title":"2 JAM WEEKDAYS","duration":120,"subtotal":35000,"isExtension":false,"ratePerHour":35000,"startTimeFormatted":"16.04","endTimeFormatted":"18.04"}]	\N	[]	4	4	4	\N	7	4	7	0	0.00	\N	\N	\N	0.00	0.00	2026-06-15 16:04:53.488762	2026-06-15 18:36:43.943587
91	TAB-260614204529	YOFI	\N	\N	4	\N	\N	PAID	BILLIARD	prepaid	1 JAM WEEKEND	2026-06-14 20:45:29.035	2026-06-14 22:45:29.035	\N	60000.00	6000.00	66000.00	0.00	0.00	0.00	0.00	66000.00	[{"method":"CASH","amount":66000,"payer":"YOFI","timestamp":"2026-06-14T15:47:02.982Z","paymentId":92}]	[{"title":"1 JAM WEEKEND","duration":0,"subtotal":30000,"isExtension":false,"ratePerHour":0,"logTime":"2026-06-14T13:45:34.265Z"},{"title":"Extend 1 JAM WEEKEND","duration":60,"subtotal":30000,"startTimeFormatted":"21.45","endTimeFormatted":"22.45","logTime":"2026-06-14T13:45:34.265Z"}]	\N	[]	4	4	4	\N	6	3	12	0	0.00	\N	\N	\N	0.00	0.00	2026-06-14 20:45:29.09148	2026-06-14 22:47:02.982919
96	TAB-260614223649	ADIT	\N	\N	7	\N	\N	PAID	BILLIARD	prepaid	1 JAM WEEKEND	2026-06-14 22:36:49.573	2026-06-15 00:36:49.573	\N	60000.00	14000.00	74000.00	0.00	0.00	0.00	0.00	74000.00	[{"method":"CASH","amount":74000,"payer":"ADIT","timestamp":"2026-06-14T17:45:52.622Z","paymentId":98}]	[{"title":"1 JAM WEEKEND","duration":0,"subtotal":30000,"isExtension":false,"ratePerHour":0,"logTime":"2026-06-14T15:37:03.993Z"},{"title":"Extend 1 JAM WEEKEND","duration":60,"subtotal":30000,"startTimeFormatted":"23.36","endTimeFormatted":"24.36","logTime":"2026-06-14T15:37:03.993Z"}]	\N	[]	4	4	4	\N	6	3	12	0	0.00	\N	\N	\N	0.00	0.00	2026-06-14 22:36:49.637127	2026-06-15 00:45:52.622217
87	TAB-260614191845	FEBRI	\N	\N	3	\N	\N	PAID	BILLIARD	prepaid	1 JAM WEEKEND	2026-06-14 19:18:45.687	2026-06-14 21:18:45.687	\N	60000.00	40000.00	100000.00	0.00	0.00	0.00	0.00	100000.00	[{"method":"CASH","amount":100000,"payer":"FEBRI","timestamp":"2026-06-14T14:20:45.021Z","paymentId":86}]	[{"title":"1 JAM WEEKEND","duration":60,"subtotal":30000,"isExtension":false,"ratePerHour":30000,"startTimeFormatted":"19.18","endTimeFormatted":"20.18"},{"title":"Extend 1 JAM WEEKEND","duration":60,"subtotal":30000,"startTimeFormatted":"20.18","endTimeFormatted":"21.18","logTime":"2026-06-14T13:16:26.285Z"}]	\N	[]	4	4	4	\N	6	3	12	0	0.00	\N	\N	\N	0.00	0.00	2026-06-14 19:18:45.734258	2026-06-14 21:20:45.021148
104	TAB-260615101030	HUMAN	\N	\N	4	\N	\N	PAID	BILLIARD	prepaid	2 JAM WEEKDAYS	2026-06-15 10:10:30.906	2026-06-15 12:10:30.906	\N	35000.00	12000.00	47000.00	0.00	0.00	0.00	0.00	47000.00	[{"method":"CASH","amount":47000,"payer":"HUMAN","timestamp":"2026-06-15T05:11:46.527Z","paymentId":105}]	[{"title":"2 JAM WEEKDAYS","duration":120,"subtotal":35000,"isExtension":false,"ratePerHour":35000,"startTimeFormatted":"10.10","endTimeFormatted":"12.10"}]	\N	[]	5	5	5	\N	\N	4	7	0	0.00	\N	\N	\N	0.00	0.00	2026-06-15 10:10:30.984959	2026-06-15 12:11:46.527492
108	TAB-260615122755	REZA	\N	\N	2	\N	\N	PAID	BILLIARD	prepaid	2 JAM WEEKDAYS	2026-06-15 12:27:55.435	2026-06-15 14:27:55.435	\N	35000.00	20000.00	55000.00	0.00	0.00	0.00	0.00	55000.00	[{"method":"CASH","amount":55000,"payer":"REZA","timestamp":"2026-06-15T07:29:24.337Z","paymentId":109}]	[{"title":"2 JAM WEEKDAYS","duration":120,"subtotal":35000,"isExtension":false,"ratePerHour":35000,"startTimeFormatted":"12.27","endTimeFormatted":"14.27"}]	\N	[]	4	4	4	\N	7	4	7	0	0.00	\N	\N	\N	0.00	0.00	2026-06-15 12:27:55.490512	2026-06-15 14:29:24.337801
119	TAB-260615193126	YENI	\N	\N	4	\N	\N	PAID	BILLIARD	prepaid	1 JAM WEEKDAYS	2026-06-15 19:31:26.469	2026-06-15 20:31:26.469	\N	25000.00	20000.00	45000.00	0.00	0.00	0.00	0.00	50000.00	[{"method":"CASH","amount":50000,"payer":"YENI","timestamp":"2026-06-15T13:32:13.294Z","paymentId":117}]	[{"title":"1 JAM WEEKDAYS","duration":60,"subtotal":25000,"isExtension":false,"ratePerHour":25000,"startTimeFormatted":"19.31","endTimeFormatted":"20.31"}]	\N	[]	4	4	4	\N	8	4	6	0	0.00	\N	\N	\N	0.00	0.00	2026-06-15 19:31:26.511195	2026-06-15 20:32:13.294412
116	TAB-260615183614	...	\N	\N	3	\N	\N	PAID	BILLIARD	prepaid	1 JAM WEEKDAYS	2026-06-15 18:36:14.343	2026-06-15 20:36:14.343	\N	50000.00	14000.00	64000.00	0.00	0.00	0.00	0.00	100000.00	[{"method":"CASH","amount":100000,"payer":"...","timestamp":"2026-06-15T13:37:40.322Z","paymentId":118}]	[{"title":"1 JAM WEEKDAYS","duration":0,"subtotal":25000,"isExtension":false,"ratePerHour":0,"logTime":"2026-06-15T11:36:36.030Z"},{"title":"Extend 1 JAM WEEKDAYS","duration":60,"subtotal":25000,"startTimeFormatted":"19.36","endTimeFormatted":"20.36","logTime":"2026-06-15T11:36:36.030Z"}]	\N	[]	4	4	4	\N	8	4	6	0	0.00	\N	\N	\N	0.00	0.00	2026-06-15 18:36:14.41418	2026-06-15 20:37:40.322677
88	TAB-260614192557	ANDRI	\N	\N	7	\N	\N	PAID	BILLIARD	prepaid	3 JAM WEEKEND	2026-06-14 19:25:57.727	2026-06-14 22:25:57.727	\N	85000.00	42000.00	127000.00	0.00	0.00	0.00	0.00	200000.00	[{"method":"CASH","amount":200000,"payer":"ANDRI","timestamp":"2026-06-14T15:29:17.050Z","paymentId":90}]	[{"title":"3 JAM WEEKEND","duration":180,"subtotal":85000,"isExtension":false,"ratePerHour":85000,"startTimeFormatted":"19.25","endTimeFormatted":"22.25"}]	\N	[]	4	4	4	\N	6	3	13	0	0.00	\N	\N	\N	0.00	0.00	2026-06-14 19:25:57.80278	2026-06-14 22:29:17.050454
70	TAB-260614115549	FAJAR	\N	\N	1	\N	\N	PAID	BILLIARD	open	OPEN TABLE WEEKEND	2026-06-14 11:55:49.685	2026-06-14 18:03:49.502	\N	133167.00	50000.00	183200.00	0.00	0.00	0.00	33.00	183200.00	[{"method":"QRIS","amount":183200,"payer":"FAJAR","timestamp":"2026-06-14T11:04:40.881Z","paymentId":78}]	[{"title":"10:00-17:00","date":"14/06/2026","startTimeFormatted":"11.55","duration":305,"cost":101666.66666666634,"isExtension":false,"ratePerHour":20000,"subtotal":101667,"endTimeFormatted":"17.00"},{"title":"17:00-02:00","date":"14/06/2026","startTimeFormatted":"17.00","duration":63,"cost":31500.000000000004,"isExtension":false,"ratePerHour":30000,"subtotal":31500,"endTimeFormatted":"18.03"}]	\N	[]	3	3	3	\N	5	3	11	0	0.00	\N	\N	\N	0.00	0.00	2026-06-14 11:55:49.730645	2026-06-14 18:04:40.881607
78	TAB-260614161138	KOCO	\N	\N	2	\N	\N	PAID	BILLIARD	prepaid	1 JAM WEEKEND	2026-06-14 16:11:38.627	2026-06-14 18:11:38.627	\N	50000.00	0.00	50000.00	0.00	0.00	0.00	0.00	50000.00	[{"method":"CASH","amount":50000,"payer":"KOCO","timestamp":"2026-06-14T11:12:06.300Z","paymentId":79}]	[{"title":"1 JAM WEEKEND","duration":0,"subtotal":20000,"isExtension":false,"ratePerHour":0,"logTime":"2026-06-14T09:12:14.310Z"},{"title":"Extend 1 JAM SORE","duration":60,"subtotal":30000,"startTimeFormatted":"17.11","endTimeFormatted":"18.11","logTime":"2026-06-14T09:12:14.310Z"}]	\N	[]	3	3	3	\N	5	3	12	0	0.00	\N	\N	\N	0.00	0.00	2026-06-14 16:11:38.682338	2026-06-14 18:12:06.300628
75	TAB-260614144217	DONI	\N	\N	6	\N	\N	PAID	BILLIARD	prepaid	1 JAM WEEKEND	2026-06-14 14:42:17.011	2026-06-14 17:42:17.011	\N	60000.00	0.00	60000.00	0.00	0.00	0.00	0.00	100000.00	[{"method":"CASH","amount":100000,"payer":"DONI","timestamp":"2026-06-14T10:43:36.004Z","paymentId":77}]	[{"title":"1 JAM WEEKEND","duration":0,"subtotal":20000,"isExtension":false,"ratePerHour":0,"logTime":"2026-06-14T07:42:27.838Z"},{"title":"Extend 1 JAM WEEKEND","duration":60,"subtotal":20000,"startTimeFormatted":"15.42","endTimeFormatted":"16.42","logTime":"2026-06-14T07:42:27.838Z"},{"title":"Extend 1 JAM WEEKEND","duration":60,"subtotal":20000,"startTimeFormatted":"16.42","endTimeFormatted":"17.42","logTime":"2026-06-14T07:47:37.282Z"}]	\N	[]	3	3	3	\N	5	3	12	0	0.00	\N	\N	\N	0.00	0.00	2026-06-14 14:42:17.058169	2026-06-14 17:43:36.004117
74	TAB-260614141557	RUDIN	\N	\N	4	\N	\N	PAID	BILLIARD	open	OPEN TABLE WEEKEND	2026-06-14 14:15:57.066	2026-06-14 16:27:56.162	\N	44000.00	23000.00	67000.00	0.00	0.00	0.00	0.00	70000.00	[{"method":"CASH","amount":70000,"payer":"RUDIN","timestamp":"2026-06-14T09:31:13.240Z","paymentId":74}]	[{"title":"10:00-17:00","date":"14/06/2026","startTimeFormatted":"14.15","duration":132,"cost":44000.00000000004,"isExtension":false,"ratePerHour":20000,"subtotal":44000,"endTimeFormatted":"16.27"}]	\N	[]	3	3	3	\N	5	3	11	0	0.00	\N	\N	\N	0.00	0.00	2026-06-14 14:15:57.135833	2026-06-14 16:31:13.24048
80	TAB-260614181946	DIMAS	\N	\N	2	\N	\N	PAID	BILLIARD	prepaid	1 JAM WEEKEND	2026-06-14 18:19:46.444	2026-06-14 20:19:46.444	\N	60000.00	32000.00	92000.00	0.00	0.00	0.00	0.00	92000.00	[{"method":"CASH","amount":92000,"payer":"DIMAS","timestamp":"2026-06-14T12:56:46.180Z","paymentId":82}]	[{"title":"1 JAM WEEKEND","duration":0,"subtotal":30000,"isExtension":false,"ratePerHour":0,"logTime":"2026-06-14T11:19:54.659Z"},{"title":"Extend 1 JAM WEEKEND","duration":60,"subtotal":30000,"startTimeFormatted":"19.19","endTimeFormatted":"20.19","logTime":"2026-06-14T11:19:54.659Z"}]	\N	[]	4	4	4	\N	6	3	12	0	0.00	\N	\N	\N	0.00	0.00	2026-06-14 18:19:46.524458	2026-06-14 19:56:46.180909
95	TAB-260614220143	NOFAL	\N	\N	3	\N	\N	PAID	BILLIARD	prepaid	1 JAM WEEKEND	2026-06-14 22:01:43.559	2026-06-14 23:01:43.559	\N	30000.00	24000.00	54000.00	0.00	0.00	0.00	0.00	100000.00	[{"method":"CASH","amount":100000,"payer":"NOFAL","timestamp":"2026-06-14T16:04:15.146Z","paymentId":94}]	[{"title":"1 JAM WEEKEND","duration":60,"subtotal":30000,"isExtension":false,"ratePerHour":30000,"startTimeFormatted":"22.01","endTimeFormatted":"23.01"}]	\N	[]	4	4	4	\N	6	3	12	0	0.00	\N	\N	\N	0.00	0.00	2026-06-14 22:01:43.603201	2026-06-14 23:04:15.146906
81	TAB-260614182623	SADA	\N	\N	6	\N	\N	PAID	BILLIARD	prepaid	3 JAM WEEKEND	2026-06-14 18:26:23.693	2026-06-14 21:26:23.693	\N	85000.00	22000.00	107000.00	0.00	0.00	0.00	0.00	107000.00	[{"method":"QRIS","amount":107000,"payer":"SADA","timestamp":"2026-06-14T14:27:04.598Z","paymentId":87}]	[{"title":"3 JAM WEEKEND","duration":180,"subtotal":85000,"isExtension":false,"ratePerHour":85000,"startTimeFormatted":"18.26","endTimeFormatted":"21.26"}]	\N	[]	4	4	4	\N	6	3	13	0	0.00	\N	\N	\N	0.00	0.00	2026-06-14 18:26:23.769648	2026-06-14 21:27:04.598536
77	TAB-260614153158	SAMSUL	\N	\N	9	\N	\N	PAID	BILLIARD	prepaid	1 JAM WEEKEND	2026-06-14 15:31:58.963	2026-06-14 18:31:58.963	\N	75000.00	20000.00	95000.00	0.00	0.00	0.00	0.00	95000.00	[{"method":"CASH","amount":95000,"payer":"SAMSUL","timestamp":"2026-06-14T11:34:12.305Z","paymentId":80}]	[{"title":"1 JAM WEEKEND","duration":0,"subtotal":25000,"isExtension":false,"ratePerHour":0,"logTime":"2026-06-14T08:32:08.546Z"},{"title":"Extend 1 JAM WEEKEND","duration":60,"subtotal":25000,"startTimeFormatted":"16.31","endTimeFormatted":"17.31","logTime":"2026-06-14T08:32:08.546Z"},{"title":"Extend 1 JAM WEEKEND","duration":60,"subtotal":25000,"startTimeFormatted":"17.31","endTimeFormatted":"18.31","logTime":"2026-06-14T08:32:15.543Z"}]	\N	[]	3	3	3	\N	5	3	15	0	0.00	\N	\N	\N	0.00	0.00	2026-06-14 15:31:59.007151	2026-06-14 18:34:12.305973
73	TAB-260614140234	VEGA	\N	\N	5	\N	\N	PAID	BILLIARD	prepaid	3 JAM WEEKEND	2026-06-14 14:02:34.217	2026-06-14 17:02:34.217	\N	55000.00	6000.00	61000.00	0.00	0.00	0.00	0.00	61000.00	[{"method":"CASH","amount":61000,"payer":"VEGA","timestamp":"2026-06-14T10:05:25.907Z","paymentId":75}]	[{"title":"3 JAM WEEKEND","duration":180,"subtotal":55000,"isExtension":false,"ratePerHour":55000,"startTimeFormatted":"14.02","endTimeFormatted":"17.02"}]	\N	[]	3	3	3	\N	5	3	13	0	0.00	\N	\N	\N	0.00	0.00	2026-06-14 14:02:34.278677	2026-06-14 17:05:25.907731
76	TAB-260614150547	IMAN	\N	\N	8	\N	\N	PAID	BILLIARD	prepaid	1 JAM WEEKEND	2026-06-14 15:05:47.955	2026-06-14 16:05:47.955	\N	20000.00	30000.00	50000.00	0.00	0.00	0.00	0.00	50000.00	[{"method":"CASH","amount":50000,"payer":"IMAN","timestamp":"2026-06-14T09:09:03.901Z","paymentId":73}]	[{"title":"1 JAM WEEKEND","duration":60,"subtotal":20000,"isExtension":false,"ratePerHour":20000,"startTimeFormatted":"15.05","endTimeFormatted":"16.05"}]	\N	[]	3	3	3	\N	5	3	12	0	0.00	\N	\N	\N	0.00	0.00	2026-06-14 15:05:47.999845	2026-06-14 16:09:03.901597
92	TAB-260614210214	ANDRE	\N	\N	5	\N	\N	PAID	BILLIARD	prepaid	3 JAM WEEKEND	2026-06-14 21:02:14.025	2026-06-15 00:02:14.025	\N	85000.00	21000.00	106000.00	0.00	0.00	0.00	0.00	106000.00	[{"method":"CASH","amount":106000,"payer":"ANDRE","timestamp":"2026-06-14T17:29:15.348Z","paymentId":97}]	[{"title":"3 JAM WEEKEND","duration":180,"subtotal":85000,"isExtension":false,"ratePerHour":85000,"startTimeFormatted":"21.02","endTimeFormatted":"24.02"}]	\N	[]	4	4	4	\N	6	3	13	0	0.00	\N	\N	\N	0.00	0.00	2026-06-14 21:02:14.085522	2026-06-15 00:29:15.348229
79	CAFE-20260614-0001-100	DILA	\N	\N	\N	1	\N	PAID	CAFE	cafe-only	\N	2026-06-14 17:34:24.95	\N	\N	0.00	12000.00	12000.00	0.00	0.00	0.00	0.00	15000.00	[{"method":"CASH","amount":15000,"payer":"DILA","timestamp":"2026-06-14T10:35:05.726Z","paymentId":76}]	[]	\N	[]	4	4	\N	\N	6	3	\N	0	0.00	\N	\N	\N	0.00	0.00	2026-06-14 17:34:24.895692	2026-06-14 17:35:05.7263
114	CAFE-20260615-0003-10	.	\N	\N	\N	1	\N	PAID	CAFE	cafe-only	\N	2026-06-15 15:48:59.019	\N	\N	0.00	15000.00	15000.00	0.00	0.00	0.00	0.00	15000.00	[{"method":"CASH","amount":15000,"payer":".","timestamp":"2026-06-15T09:53:27.484Z","paymentId":114}]	[]	\N	[]	4	4	\N	\N	7	4	\N	0	0.00	\N	\N	\N	0.00	0.00	2026-06-15 15:48:58.892073	2026-06-15 16:53:27.484375
85	TAB-260614184338	YOFI	\N	\N	4	\N	\N	PAID	BILLIARD	prepaid	1 JAM WEEKEND	2026-06-14 18:43:38.397	2026-06-14 20:43:38.397	\N	60000.00	41000.00	101000.00	0.00	0.00	0.00	0.00	101000.00	[{"method":"CASH","amount":101000,"payer":"YOFI","timestamp":"2026-06-14T13:45:02.486Z","paymentId":84}]	[{"title":"1 JAM WEEKEND","duration":0,"subtotal":30000,"isExtension":false,"ratePerHour":0,"logTime":"2026-06-14T11:43:46.845Z"},{"title":"Extend 1 JAM WEEKEND","duration":60,"subtotal":30000,"startTimeFormatted":"19.43","endTimeFormatted":"20.43","logTime":"2026-06-14T11:43:46.845Z"}]	\N	[]	4	4	4	\N	6	3	12	0	0.00	\N	\N	\N	0.00	0.00	2026-06-14 18:43:38.467863	2026-06-14 20:45:02.486519
123	TAB-260615202337	ANTON	\N	\N	5	\N	\N	PAID	BILLIARD	prepaid	3 JAM WEEKDAYS	2026-06-15 20:23:37.434	2026-06-15 23:23:37.434	\N	77000.00	14000.00	91000.00	0.00	0.00	0.00	0.00	91000.00	[{"method":"CASH","amount":91000,"payer":"ANTON","timestamp":"2026-06-15T16:25:40.323Z","paymentId":123}]	[{"title":"3 JAM WEEKDAYS","duration":180,"subtotal":77000,"isExtension":false,"ratePerHour":77000,"startTimeFormatted":"20.23","endTimeFormatted":"23.23"}]	\N	[]	4	4	4	\N	8	4	8	0	0.00	\N	\N	\N	0.00	0.00	2026-06-15 20:23:37.476652	2026-06-15 23:25:40.32393
99	TAB-260614233717	REYHAN	\N	\N	10	\N	\N	PAID	BILLIARD	prepaid	1 JAM WEEKEND	2026-06-14 23:37:17.569	2026-06-15 01:37:17.569	\N	70000.00	30000.00	100000.00	0.00	0.00	0.00	0.00	100000.00	[{"method":"CASH","amount":100000,"payer":"REYHAN","timestamp":"2026-06-14T18:38:47.499Z","paymentId":101}]	[{"title":"1 JAM WEEKEND","duration":0,"subtotal":35000,"isExtension":false,"ratePerHour":0,"logTime":"2026-06-14T16:37:29.681Z"},{"title":"Extend 1 JAM WEEKEND","duration":60,"subtotal":35000,"startTimeFormatted":"24.37","endTimeFormatted":"01.37","logTime":"2026-06-14T16:37:29.681Z"}]	\N	[]	4	4	4	\N	6	3	15	0	0.00	\N	\N	\N	0.00	0.00	2026-06-14 23:37:17.665181	2026-06-15 01:38:47.499338
124	TAB-260615204508	MAMAT	\N	\N	4	\N	\N	PAID	BILLIARD	prepaid	3 JAM WEEKDAYS	2026-06-15 20:45:08.612	2026-06-15 23:45:08.612	\N	77000.00	0.00	77000.00	0.00	0.00	0.00	0.00	77000.00	[{"method":"CASH","amount":77000,"payer":"MAMAT","timestamp":"2026-06-15T16:46:07.003Z","paymentId":127}]	[{"title":"3 JAM WEEKDAYS","duration":180,"subtotal":77000,"isExtension":false,"ratePerHour":77000,"startTimeFormatted":"20.45","endTimeFormatted":"23.45"}]	\N	[]	4	4	4	\N	8	4	8	0	0.00	\N	\N	\N	0.00	0.00	2026-06-15 20:45:08.664653	2026-06-15 23:46:07.0036
89	TAB-260614200104	GILANG	\N	\N	2	\N	\N	PAID	BILLIARD	open	OPEN TABLE WEEKEND	2026-06-14 20:01:04.263	2026-06-14 21:32:47.288	\N	46000.00	20000.00	66000.00	0.00	0.00	0.00	0.00	100000.00	[{"method":"CASH","amount":100000,"payer":"GILANG","timestamp":"2026-06-14T14:34:06.478Z","paymentId":88}]	[{"title":"17:00-02:00","date":"14/06/2026","startTimeFormatted":"20.01","duration":92,"cost":46000.00000000001,"isExtension":false,"ratePerHour":30000,"subtotal":46000,"endTimeFormatted":"21.33"}]	\N	[]	4	4	4	\N	6	3	11	0	0.00	\N	\N	\N	0.00	0.00	2026-06-14 20:01:04.330777	2026-06-14 21:34:06.478236
101	TAB-260614001946	...	\N	\N	11	\N	\N	PAID	BILLIARD	prepaid	Custom Session	2026-06-15 00:19:46.678	2026-06-15 02:19:46.678	\N	90000.00	0.00	90000.00	0.00	0.00	0.00	0.00	90000.00	[{"method":"CASH","amount":90000,"payer":"...","timestamp":"2026-06-14T19:22:35.183Z","paymentId":102}]	[{"title":"Custom Session","duration":120,"subtotal":90000,"isExtension":false,"ratePerHour":0,"startTimeFormatted":"24.19","endTimeFormatted":"02.19"}]	\N	[]	4	4	4	\N	6	3	\N	0	0.00	\N	\N	\N	0.00	0.00	2026-06-15 00:19:46.745083	2026-06-15 02:22:35.183321
82	TAB-260614183454	SAMSUL	\N	\N	9	\N	\N	PAID	BILLIARD	prepaid	1 JAM WEEKEND	2026-06-14 18:34:54.088	2026-06-14 19:34:54.088	\N	35000.00	0.00	35000.00	0.00	0.00	0.00	0.00	35000.00	[{"method":"CASH","amount":35000,"payer":"SAMSUL","timestamp":"2026-06-14T12:37:40.052Z","paymentId":81}]	[{"title":"1 JAM WEEKEND","duration":60,"subtotal":35000,"isExtension":false,"ratePerHour":35000,"startTimeFormatted":"18.34","endTimeFormatted":"19.34"}]	\N	[]	4	4	4	\N	6	3	15	0	0.00	\N	\N	\N	0.00	0.00	2026-06-14 18:34:54.146174	2026-06-14 19:37:40.052566
84	TAB-260614184102	TEGAR	\N	\N	1	\N	\N	PAID	BILLIARD	prepaid	3 JAM WEEKEND	2026-06-14 18:41:02.364	2026-06-14 21:41:02.364	\N	85000.00	30000.00	115000.00	0.00	0.00	0.00	0.00	115000.00	[{"method":"QRIS","amount":115000,"payer":"TEGAR","timestamp":"2026-06-14T14:42:20.156Z","paymentId":89}]	[{"title":"3 JAM WEEKEND","duration":180,"subtotal":85000,"isExtension":false,"ratePerHour":85000,"startTimeFormatted":"18.41","endTimeFormatted":"21.41"}]	\N	[]	4	4	4	\N	6	3	13	0	0.00	\N	\N	\N	0.00	0.00	2026-06-14 18:41:02.448952	2026-06-14 21:42:20.156176
83	TAB-260614183730	MAULANA	\N	\N	10	\N	\N	PAID	BILLIARD	prepaid	1 JAM WEEKEND	2026-06-14 18:37:30.692	2026-06-14 20:37:30.692	\N	70000.00	6000.00	76000.00	0.00	0.00	0.00	0.00	76000.00	[{"method":"QRIS","amount":76000,"payer":"MAULANA","timestamp":"2026-06-14T13:41:15.724Z","paymentId":83}]	[{"title":"1 JAM WEEKEND","duration":0,"subtotal":35000,"isExtension":false,"ratePerHour":0,"logTime":"2026-06-14T11:37:54.119Z"},{"title":"Extend 1 JAM WEEKEND","duration":60,"subtotal":35000,"startTimeFormatted":"19.37","endTimeFormatted":"20.37","logTime":"2026-06-14T11:37:54.119Z"}]	\N	[]	4	4	4	\N	6	3	15	0	0.00	\N	\N	\N	0.00	0.00	2026-06-14 18:37:30.734582	2026-06-14 20:41:15.724213
94	TAB-260614220037	?	\N	\N	12	\N	\N	PAID	BILLIARD	open	OPEN TABLE WEEKEND	2026-06-14 22:00:37	2026-06-14 23:00:13.249	\N	45000.00	0.00	45000.00	0.00	0.00	0.00	0.00	45000.00	[{"method":"CASH","amount":45000,"payer":"?","timestamp":"2026-06-14T16:01:29.702Z","paymentId":93}]	[{"title":"17:00-02:00","date":"14/06/2026","startTimeFormatted":"22.00","duration":60,"cost":45000,"isExtension":false,"ratePerHour":45000,"subtotal":45000,"endTimeFormatted":"23.00"}]	\N	[]	4	4	4	\N	6	3	17	0	0.00	\N	\N	\N	0.00	0.00	2026-06-14 22:00:37.046054	2026-06-14 23:01:29.702697
112	TAB-260615145022	.	\N	\N	2	\N	\N	PAID	BILLIARD	prepaid	1 JAM WEEKDAYS	2026-06-15 14:50:22.592	2026-06-15 16:50:22.592	\N	40000.00	22000.00	62000.00	0.00	0.00	0.00	0.00	62000.00	[{"method":"CASH","amount":62000,"payer":".","timestamp":"2026-06-15T09:51:10.373Z","paymentId":113}]	[{"title":"1 JAM WEEKDAYS","duration":60,"subtotal":20000,"isExtension":false,"ratePerHour":20000,"startTimeFormatted":"14.50","endTimeFormatted":"15.50"},{"title":"Extend 1 JAM WEEKDAYS","duration":60,"subtotal":20000,"startTimeFormatted":"15.50","endTimeFormatted":"16.50","logTime":"2026-06-15T08:44:03.644Z"}]	\N	[]	4	4	4	\N	7	4	6	0	0.00	\N	\N	\N	0.00	0.00	2026-06-15 14:50:22.638309	2026-06-15 16:51:10.373661
110	TAB-260615131853	HARTONO	\N	\N	4	\N	\N	PAID	BILLIARD	prepaid	3 JAM WEEKDAYS	2026-06-15 13:18:53.025	2026-06-15 17:19:56.575	\N	73000.00	12000.00	85000.00	0.00	0.00	0.00	0.00	85000.00	[{"method":"CASH","amount":85000,"payer":"HARTONO","timestamp":"2026-06-15T10:24:12.996Z","paymentId":115}]	[{"title":"3 JAM WEEKDAYS","duration":180,"subtotal":53000,"isExtension":false,"ratePerHour":53000,"startTimeFormatted":"13.18","endTimeFormatted":"16.18"},{"title":"Extend 1 JAM WEEKDAYS","duration":60,"subtotal":20000,"startTimeFormatted":"16.19","endTimeFormatted":"17.19","logTime":"2026-06-15T09:19:56.644Z"}]	\N	[]	4	4	4	\N	7	4	8	0	0.00	\N	\N	\N	0.00	0.00	2026-06-15 13:18:53.076121	2026-06-15 17:24:12.996793
106	TAB-260615112350	LUKI	\N	\N	1	\N	\N	PAID	BILLIARD	prepaid	3 JAM WEEKDAYS	2026-06-15 11:23:50.036	2026-06-15 14:23:50.036	\N	53000.00	30000.00	83000.00	0.00	0.00	0.00	0.00	83000.00	[{"method":"CASH","amount":83000,"payer":"LUKI","timestamp":"2026-06-15T07:28:26.291Z","paymentId":108}]	[{"title":"3 JAM WEEKDAYS","duration":180,"subtotal":53000,"isExtension":false,"ratePerHour":53000,"startTimeFormatted":"11.23","endTimeFormatted":"14.23"}]	\N	[]	4	4	4	\N	7	4	8	0	0.00	\N	\N	\N	0.00	0.00	2026-06-15 11:23:50.076901	2026-06-15 14:28:26.291459
122	TAB-260615194609	AALEX	\N	\N	6	\N	\N	PAID	BILLIARD	open	OPEN TABLE WEEKDAYS	2026-06-15 19:46:09.943	2026-06-15 22:20:14.053	\N	64583.00	45000.00	109600.00	0.00	0.00	0.00	17.00	109600.00	[{"method":"CASH","amount":109600,"payer":"AALEX","timestamp":"2026-06-15T15:20:45.736Z","paymentId":122}]	[{"title":"17:00-02:00","date":"15/06/2026","startTimeFormatted":"19.46","duration":155,"cost":64583.33333333318,"isExtension":false,"ratePerHour":25000,"subtotal":64583,"endTimeFormatted":"22.21"}]	\N	[]	4	4	4	\N	8	4	5	0	0.00	\N	\N	\N	0.00	0.00	2026-06-15 19:46:09.991777	2026-06-15 22:20:45.736138
117	TAB-260615190443	ROI	\N	\N	7	\N	\N	PAID	BILLIARD	prepaid	1 JAM WEEKDAYS	2026-06-15 19:04:43.419	2026-06-15 21:04:43.419	\N	50000.00	21000.00	71000.00	0.00	0.00	0.00	0.00	71000.00	[{"method":"CASH","amount":71000,"payer":"ROI","timestamp":"2026-06-15T14:06:07.714Z","paymentId":119}]	[{"title":"1 JAM WEEKDAYS","duration":0,"subtotal":25000,"isExtension":false,"ratePerHour":0,"logTime":"2026-06-15T12:05:16.575Z"},{"title":"Extend 1 JAM WEEKDAYS","duration":60,"subtotal":25000,"startTimeFormatted":"20.04","endTimeFormatted":"21.04","logTime":"2026-06-15T12:05:16.575Z"}]	\N	[]	4	4	4	\N	8	4	6	0	0.00	\N	\N	\N	0.00	0.00	2026-06-15 19:04:43.467477	2026-06-15 21:06:07.714626
118	TAB-260615191235	PUNGKY	\N	\N	1	\N	\N	PAID	BILLIARD	prepaid	1 JAM WEEKDAYS	2026-06-15 19:12:35.25	2026-06-15 21:12:35.25	\N	50000.00	36000.00	86000.00	0.00	0.00	0.00	0.00	100000.00	[{"method":"CASH","amount":100000,"payer":"PUNGKY","timestamp":"2026-06-15T14:14:24.265Z","paymentId":120}]	[{"title":"1 JAM WEEKDAYS","duration":0,"subtotal":25000,"isExtension":false,"ratePerHour":0,"logTime":"2026-06-15T12:16:04.782Z"},{"title":"Extend 1 JAM WEEKDAYS","duration":60,"subtotal":25000,"startTimeFormatted":"20.12","endTimeFormatted":"21.12","logTime":"2026-06-15T12:16:04.782Z"}]	\N	[]	4	4	4	\N	8	4	6	0	0.00	\N	\N	\N	0.00	0.00	2026-06-15 19:12:35.290229	2026-06-15 21:14:24.265814
129	TAB-260615215230	....	\N	\N	8	\N	\N	PAID	BILLIARD	open	OPEN TABLE WEEKDAYS	2026-06-15 21:52:30.188	2026-06-16 00:22:46.644	\N	62916.00	61000.00	124000.00	0.00	0.00	0.00	84.00	124000.00	[{"method":"CASH","amount":124000,"payer":"....","timestamp":"2026-06-15T17:25:26.958Z","paymentId":129}]	[{"title":"17:00-02:00","date":"15/06/2026","startTimeFormatted":"21.52","duration":128,"cost":53333.33333333325,"isExtension":false,"ratePerHour":25000,"subtotal":53333,"endTimeFormatted":"00.00"},{"title":"17:00-02:00","date":"16/06/2026","startTimeFormatted":"00.00","duration":23,"cost":9583.333333333334,"isExtension":false,"ratePerHour":25000,"subtotal":9583,"endTimeFormatted":"00.23"}]	\N	[]	4	4	4	\N	8	4	5	0	0.00	\N	\N	\N	0.00	0.00	2026-06-15 21:52:30.261036	2026-06-16 00:25:26.958084
138	TAB-260616151329	bagus	\N	\N	1	\N	\N	PAID	BILLIARD	prepaid	1 JAM WEEKEND	2026-06-16 15:13:29.626	2026-06-16 18:13:29.626	\N	60000.00	22000.00	82000.00	0.00	0.00	0.00	0.00	100000.00	[{"method":"CASH","amount":100000,"payer":"bagus","timestamp":"2026-06-16T11:19:09.992Z","paymentId":141}]	[{"title":"1 JAM WEEKEND","duration":0,"subtotal":20000,"isExtension":false,"ratePerHour":0,"logTime":"2026-06-16T08:13:59.726Z"},{"title":"Extend 1 JAM WEEKEND","duration":60,"subtotal":20000,"startTimeFormatted":"16.13","endTimeFormatted":"17.13","logTime":"2026-06-16T08:13:59.727Z"},{"title":"Extend 1 JAM WEEKEND","duration":60,"subtotal":20000,"startTimeFormatted":"17.13","endTimeFormatted":"18.13","logTime":"2026-06-16T08:14:38.498Z"}]	\N	[]	3	3	3	\N	9	7	22	0	0.00	\N	\N	\N	0.00	0.00	2026-06-16 15:13:29.672593	2026-06-16 18:19:09.992609
140	TAB-260616154805	bogel	\N	\N	4	\N	\N	PAID	BILLIARD	open	OPEN TABLE WEEKEND	2026-06-16 15:48:04.986	2026-06-16 17:51:08.024	\N	50000.00	12000.00	62000.00	0.00	0.00	0.00	0.00	102000.00	[{"method":"CASH","amount":102000,"payer":"bogel","timestamp":"2026-06-16T10:51:37.173Z","paymentId":140}]	[{"title":"10:00-17:00","date":"16/06/2026","startTimeFormatted":"15.48","duration":72,"cost":23999.999999999985,"isExtension":false,"ratePerHour":20000,"subtotal":24000,"endTimeFormatted":"17.00"},{"title":"17:00-02:00","date":"16/06/2026","startTimeFormatted":"17.00","duration":52,"cost":26000.000000000004,"isExtension":false,"ratePerHour":30000,"subtotal":26000,"endTimeFormatted":"17.52"}]	\N	[]	3	3	3	\N	9	7	11	0	0.00	\N	\N	\N	0.00	0.00	2026-06-16 15:48:05.032501	2026-06-16 17:51:37.173123
146	TAB-260616193519	ALPAN	\N	\N	4	\N	\N	PAID	BILLIARD	open	OPEN TABLE WEEKEND	2026-06-16 19:35:19.496	2026-06-16 23:51:09.678	\N	128000.00	0.00	128000.00	0.00	0.00	0.00	0.00	130000.00	[{"method":"CASH","amount":130000,"payer":"ALPAN","timestamp":"2026-06-16T16:54:37.634Z","paymentId":154}]	[{"title":"17:00-02:00","date":"16/06/2026","startTimeFormatted":"19.35","duration":256,"cost":128000.00000000001,"isExtension":false,"ratePerHour":30000,"subtotal":128000,"endTimeFormatted":"23.51"}]	\N	[]	4	4	4	\N	10	7	11	0	0.00	\N	\N	\N	0.00	0.00	2026-06-16 19:35:19.550195	2026-06-16 23:54:37.634061
136	TAB-260616114353	ALEN	\N	\N	1	\N	\N	PAID	BILLIARD	prepaid	1 JAM WEEKEND	2026-06-16 11:43:53.129	2026-06-16 13:43:53.129	\N	40000.00	12000.00	52000.00	0.00	0.00	0.00	0.00	52000.00	[{"method":"CASH","amount":52000,"payer":"ALEN","timestamp":"2026-06-16T06:47:58.712Z","paymentId":135}]	[{"title":"1 JAM WEEKEND","duration":0,"subtotal":20000,"isExtension":false,"ratePerHour":0,"logTime":"2026-06-16T04:43:58.328Z"},{"title":"Extend 1 JAM WEEKEND","duration":60,"subtotal":20000,"startTimeFormatted":"12.43","endTimeFormatted":"13.43","logTime":"2026-06-16T04:43:58.328Z"}]	\N	[]	3	3	3	\N	9	7	22	0	0.00	\N	\N	\N	0.00	0.00	2026-06-16 11:43:53.171435	2026-06-16 13:47:58.71211
149	TAB-260616203330	ARIF	\N	\N	5	\N	\N	PAID	BILLIARD	prepaid	1 JAM WEEKEND	2026-06-16 20:33:30.21	2026-06-16 22:33:30.21	\N	60000.00	56000.00	116000.00	0.00	0.00	0.00	0.00	116000.00	[{"method":"CASH","amount":116000,"payer":"ARIF","timestamp":"2026-06-16T15:35:58.648Z","paymentId":152}]	[{"title":"1 JAM WEEKEND","duration":0,"subtotal":30000,"isExtension":false,"ratePerHour":0,"logTime":"2026-06-16T13:33:38.217Z"},{"title":"Extend 1 JAM WEEKEND","duration":60,"subtotal":30000,"startTimeFormatted":"21.33","endTimeFormatted":"22.33","logTime":"2026-06-16T13:33:38.217Z"}]	\N	[]	4	4	4	\N	10	7	22	0	0.00	\N	\N	\N	0.00	0.00	2026-06-16 20:33:30.301842	2026-06-16 22:35:58.648068
144	TAB-260616192238	DIDIK	\N	\N	7	\N	\N	PAID	BILLIARD	prepaid	1 JAM WEEKEND	2026-06-16 19:22:38.358	2026-06-16 21:22:38.358	\N	60000.00	0.00	60000.00	0.00	0.00	0.00	0.00	60000.00	[{"method":"CASH","amount":60000,"payer":"DIDIK","timestamp":"2026-06-16T14:19:16.093Z","paymentId":145}]	[{"title":"1 JAM WEEKEND","duration":0,"subtotal":30000,"isExtension":false,"ratePerHour":0,"logTime":"2026-06-16T12:22:45.117Z"},{"title":"Extend 1 JAM WEEKEND","duration":60,"subtotal":30000,"startTimeFormatted":"20.22","endTimeFormatted":"21.22","logTime":"2026-06-16T12:22:45.117Z"}]	\N	[]	4	4	4	\N	10	7	22	0	0.00	\N	\N	\N	0.00	0.00	2026-06-16 19:22:38.406587	2026-06-16 21:19:16.09322
148	TAB-260616202857	NOPAL	\N	\N	1	\N	\N	PAID	BILLIARD	prepaid	1 JAM WEEKEND	2026-06-16 20:28:57.625	2026-06-16 22:28:57.625	\N	60000.00	0.00	60000.00	0.00	0.00	0.00	0.00	60000.00	[{"method":"QRIS","amount":60000,"payer":"NOPAL","timestamp":"2026-06-16T15:29:17.761Z","paymentId":151}]	[{"title":"1 JAM WEEKEND","duration":0,"subtotal":30000,"isExtension":false,"ratePerHour":0,"logTime":"2026-06-16T13:29:06.583Z"},{"title":"Extend 1 JAM WEEKEND","duration":60,"subtotal":30000,"startTimeFormatted":"21.28","endTimeFormatted":"22.28","logTime":"2026-06-16T13:29:06.584Z"}]	\N	[]	4	4	4	\N	10	7	22	0	0.00	\N	\N	\N	0.00	0.00	2026-06-16 20:28:57.680025	2026-06-16 22:29:17.761777
131	TAB-260615234901	AGUNG	\N	\N	5	\N	\N	PAID	BILLIARD	prepaid	1 JAM WEEKDAYS	2026-06-15 23:49:01.384	2026-06-16 01:49:01.384	\N	50000.00	0.00	50000.00	0.00	0.00	0.00	0.00	50000.00	[{"method":"CASH","amount":50000,"payer":"AGUNG","timestamp":"2026-06-15T18:52:47.478Z","paymentId":133}]	[{"title":"1 JAM WEEKDAYS","duration":0,"subtotal":25000,"isExtension":false,"ratePerHour":0,"logTime":"2026-06-15T16:49:12.232Z"},{"title":"Extend 1 JAM WEEKDAYS","duration":60,"subtotal":25000,"startTimeFormatted":"24.49","endTimeFormatted":"01.49","logTime":"2026-06-15T16:49:12.232Z"}]	\N	[]	4	4	4	\N	8	4	6	0	0.00	\N	\N	\N	0.00	0.00	2026-06-15 23:49:01.445215	2026-06-16 01:52:47.478556
126	TAB-260615212400	UCUP	\N	\N	2	\N	\N	PAID	BILLIARD	prepaid	1 JAM WEEKDAYS	2026-06-15 21:24:00.837	2026-06-16 00:24:00.837	\N	75000.00	6000.00	81000.00	0.00	0.00	0.00	0.00	111000.00	[{"method":"CASH","amount":30000,"payer":"Payer 1","timestamp":"2026-06-15T17:26:14.235Z","paymentId":130},{"method":"QRIS","amount":81000,"payer":"UCUP","timestamp":"2026-06-15T17:26:46.350Z","paymentId":131}]	[{"title":"1 JAM WEEKDAYS","duration":0,"subtotal":25000,"isExtension":false,"ratePerHour":0,"logTime":"2026-06-15T14:24:08.774Z"},{"title":"Extend 1 JAM WEEKDAYS","duration":60,"subtotal":25000,"startTimeFormatted":"22.24","endTimeFormatted":"23.24","logTime":"2026-06-15T14:24:08.774Z"},{"title":"Extend 1 JAM WEEKDAYS","duration":60,"subtotal":25000,"startTimeFormatted":"23.24","endTimeFormatted":"24.24","logTime":"2026-06-15T14:38:26.606Z"}]	\N	[]	4	4	4	4	8	4	6	0	0.00	\N	\N	\N	0.00	0.00	2026-06-15 21:24:00.888631	2026-06-16 00:26:46.350686
139	TAB-260616152311	lucky	\N	\N	2	\N	\N	PAID	BILLIARD	prepaid	1 JAM WEEKEND	2026-06-16 15:23:11.942	2026-06-16 18:23:11.942	\N	70000.00	42000.00	112000.00	0.00	0.00	0.00	0.00	112000.00	[{"method":"QRIS","amount":112000,"payer":"lucky","timestamp":"2026-06-16T11:27:04.055Z","paymentId":142}]	[{"title":"1 JAM WEEKEND","duration":0,"subtotal":20000,"isExtension":false,"ratePerHour":0,"logTime":"2026-06-16T08:23:35.219Z"},{"title":"Extend 1 JAM WEEKEND","duration":60,"subtotal":20000,"startTimeFormatted":"16.23","endTimeFormatted":"17.23","logTime":"2026-06-16T08:23:35.219Z"},{"title":"Extend 1 JAM WEEKEND","duration":60,"subtotal":30000,"startTimeFormatted":"17.23","endTimeFormatted":"18.23","logTime":"2026-06-16T10:14:52.064Z"}]	\N	[]	3	3	3	\N	9	7	22	0	0.00	\N	\N	\N	0.00	0.00	2026-06-16 15:23:11.988603	2026-06-16 18:27:04.055265
130	TAB-260615233448	REHAN	\N	\N	3	\N	\N	PAID	BILLIARD	prepaid	2 JAM WEEKDAYS	2026-06-15 23:34:48.052	2026-06-16 01:34:48.052	\N	40000.00	6000.00	46000.00	0.00	0.00	0.00	0.00	50000.00	[{"method":"CASH","amount":50000,"payer":"REHAN","timestamp":"2026-06-15T18:39:42.932Z","paymentId":132}]	[{"title":"2 JAM WEEKDAYS","duration":120,"subtotal":40000,"isExtension":false,"ratePerHour":40000,"startTimeFormatted":"23.34","endTimeFormatted":"01.34"}]	\N	[]	4	4	4	\N	8	4	7	0	0.00	\N	\N	\N	0.00	0.00	2026-06-15 23:34:48.112443	2026-06-16 01:39:42.932458
153	TAB-260616220415	AKBAR	\N	\N	3	\N	\N	PAID	BILLIARD	prepaid	1 JAM WEEKEND	2026-06-16 22:04:15.77	2026-06-16 23:04:15.77	\N	30000.00	0.00	30000.00	0.00	0.00	0.00	0.00	30000.00	[{"method":"CASH","amount":30000,"payer":"AKBAR","timestamp":"2026-06-16T16:02:02.126Z","paymentId":153}]	[{"title":"1 JAM WEEKEND","duration":60,"subtotal":30000,"isExtension":false,"ratePerHour":30000,"startTimeFormatted":"22.04","endTimeFormatted":"23.01"}]	\N	[]	4	4	4	\N	10	7	22	0	0.00	\N	\N	\N	0.00	0.00	2026-06-16 22:04:15.825947	2026-06-16 23:02:02.126462
121	TAB-260615194405	ARTA	\N	\N	1	\N	\N	PAID	BILLIARD	open	OPEN TABLE WEEKDAYS	2026-06-15 19:44:05.304	2026-06-16 00:09:55.121	\N	110834.00	36000.00	146900.00	0.00	0.00	0.00	66.00	146900.00	[{"method":"QRIS","amount":146900,"payer":"ARTA","timestamp":"2026-06-15T17:11:39.472Z","paymentId":128}]	[{"title":"17:00-02:00","date":"15/06/2026","startTimeFormatted":"19.44","duration":256,"cost":106666.66666666699,"isExtension":false,"ratePerHour":25000,"subtotal":106667,"endTimeFormatted":"00.00"},{"title":"17:00-02:00","date":"16/06/2026","startTimeFormatted":"00.00","duration":10,"cost":4166.666666666666,"isExtension":false,"ratePerHour":25000,"subtotal":4167,"endTimeFormatted":"00.10"}]	\N	[]	4	4	4	\N	8	4	5	0	0.00	\N	\N	\N	0.00	0.00	2026-06-15 19:44:05.36799	2026-06-16 00:11:39.472509
150	TAB-260616210553	SLIM	\N	\N	8	\N	\N	PAID	BILLIARD	prepaid	1 JAM WEEKEND	2026-06-16 21:05:53.484	2026-06-16 22:05:53.484	\N	30000.00	0.00	30000.00	0.00	0.00	0.00	0.00	30000.00	[{"method":"CASH","amount":30000,"payer":"SLIM","timestamp":"2026-06-16T15:11:00.934Z","paymentId":150}]	[{"title":"1 JAM WEEKEND","duration":60,"subtotal":30000,"isExtension":false,"ratePerHour":30000,"startTimeFormatted":"21.05","endTimeFormatted":"22.05"}]	\N	[]	4	4	4	\N	10	7	22	0	0.00	\N	\N	\N	0.00	0.00	2026-06-16 21:05:53.535558	2026-06-16 22:11:00.93426
154	TAB-260616222340	WILDAN	\N	\N	6	\N	\N	PAID	BILLIARD	prepaid	1 JAM WEEKEND	2026-06-16 22:23:40.328	2026-06-17 00:23:40.328	\N	60000.00	0.00	60000.00	0.00	0.00	0.00	0.00	60000.00	[{"method":"CASH","amount":60000,"payer":"WILDAN","timestamp":"2026-06-16T17:27:54.874Z","paymentId":155}]	[{"title":"1 JAM WEEKEND","duration":0,"subtotal":30000,"isExtension":false,"ratePerHour":0,"logTime":"2026-06-16T15:23:44.929Z"},{"title":"Extend 1 JAM WEEKEND","duration":60,"subtotal":30000,"startTimeFormatted":"23.23","endTimeFormatted":"24.23","logTime":"2026-06-16T15:23:44.929Z"}]	\N	[]	4	4	4	\N	10	7	22	0	0.00	\N	\N	\N	0.00	0.00	2026-06-16 22:23:40.39915	2026-06-17 00:27:54.874107
137	TAB-260616125934	candra	\N	\N	8	\N	\N	PAID	BILLIARD	prepaid	3 JAM WEEKEND	2026-06-16 12:59:34.049	2026-06-16 15:59:34.049	\N	55000.00	45000.00	100000.00	0.00	0.00	0.00	0.00	100000.00	[{"method":"CASH","amount":100000,"payer":"candra","timestamp":"2026-06-16T09:00:59.197Z","paymentId":139}]	[{"title":"3 JAM WEEKEND","duration":180,"subtotal":55000,"isExtension":false,"ratePerHour":55000,"startTimeFormatted":"12.59","endTimeFormatted":"15.59"}]	\N	[]	3	3	3	\N	9	7	13	0	0.00	\N	\N	\N	0.00	0.00	2026-06-16 12:59:34.093045	2026-06-16 16:00:59.197879
141	TAB-260616185320	IKHROM	\N	\N	2	\N	\N	PAID	BILLIARD	prepaid	1 JAM WEEKEND	2026-06-16 18:53:20.726	2026-06-16 20:53:20.726	\N	60000.00	12000.00	72000.00	0.00	0.00	0.00	0.00	72000.00	[{"method":"CASH","amount":72000,"payer":"IKHROM","timestamp":"2026-06-16T13:56:55.788Z","paymentId":144}]	[{"title":"1 JAM WEEKEND","duration":0,"subtotal":30000,"isExtension":false,"ratePerHour":0,"logTime":"2026-06-16T11:53:33.963Z"},{"title":"Extend 1 JAM WEEKEND","duration":60,"subtotal":30000,"startTimeFormatted":"19.53","endTimeFormatted":"20.53","logTime":"2026-06-16T11:53:33.964Z"}]	\N	[]	4	4	4	\N	10	7	22	0	0.00	\N	\N	\N	0.00	0.00	2026-06-16 18:53:20.768839	2026-06-16 20:56:55.788337
152	CAFE-20260616-0002-901	AKBAR	\N	\N	\N	2	\N	PAID	CAFE	cafe-only	\N	2026-06-16 21:30:45.343	\N	\N	0.00	17000.00	17000.00	0.00	0.00	0.00	0.00	20000.00	[{"method":"CASH","amount":20000,"payer":"AKBAR","timestamp":"2026-06-16T14:55:42.645Z","paymentId":147}]	[]	\N	[]	4	4	\N	\N	10	7	\N	0	0.00	\N	\N	\N	0.00	0.00	2026-06-16 21:30:45.316104	2026-06-16 21:55:42.645789
147	CAFE-20260616-0001-274	.	\N	\N	\N	1	\N	PAID	CAFE	cafe-only	\N	2026-06-16 20:02:10.061	\N	\N	0.00	30000.00	30000.00	0.00	0.00	0.00	0.00	30000.00	[{"method":"QRIS","amount":30000,"payer":".","timestamp":"2026-06-16T15:06:13.885Z","paymentId":148}]	[]	\N	[]	4	4	\N	\N	10	7	\N	0	0.00	\N	\N	\N	0.00	0.00	2026-06-16 20:02:10.029358	2026-06-16 22:06:13.88559
142	TAB-260616185607	SALOM	\N	\N	6	\N	\N	PAID	BILLIARD	prepaid	3 JAM WEEKEND	2026-06-16 18:56:07.588	2026-06-16 21:56:07.588	\N	85000.00	10000.00	95000.00	0.00	0.00	0.00	0.00	100000.00	[{"method":"CASH","amount":100000,"payer":"SALOM","timestamp":"2026-06-16T15:10:36.838Z","paymentId":149}]	[{"title":"3 JAM WEEKEND","duration":180,"subtotal":85000,"isExtension":false,"ratePerHour":85000,"startTimeFormatted":"18.56","endTimeFormatted":"21.56"}]	\N	[]	4	4	4	\N	10	7	13	0	0.00	\N	\N	\N	0.00	0.00	2026-06-16 18:56:07.642723	2026-06-16 22:10:36.838037
133	TAB-260616105508	RIZAQ	\N	\N	9	\N	\N	PAID	BILLIARD	prepaid	3 JAM WEEKEND	2026-06-16 10:55:08.704	2026-06-16 14:56:42.49	\N	95000.00	12000.00	107000.00	0.00	0.00	0.00	0.00	107000.00	[{"method":"CASH","amount":107000,"payer":"RIZAQ","timestamp":"2026-06-16T08:09:13.431Z","paymentId":137}]	[{"title":"3 JAM WEEKEND","duration":180,"subtotal":70000,"isExtension":false,"ratePerHour":70000,"startTimeFormatted":"10.55","endTimeFormatted":"13.55"},{"title":"Extend 1 JAM WEEKEND","duration":60,"subtotal":25000,"startTimeFormatted":"13.56","endTimeFormatted":"14.56","logTime":"2026-06-16T06:56:42.658Z"}]	\N	[]	3	3	3	\N	9	7	16	0	0.00	\N	\N	\N	0.00	0.00	2026-06-16 10:55:08.782132	2026-06-16 15:09:13.431452
127	TAB-260615212813	RENDY 	\N	\N	7	\N	\N	PAID	BILLIARD	prepaid	1 JAM WEEKDAYS	2026-06-15 21:28:13.964	2026-06-15 23:28:13.964	\N	50000.00	10000.00	60000.00	0.00	0.00	0.00	0.00	60000.00	[{"method":"CASH","amount":60000,"payer":"RENDY ","timestamp":"2026-06-15T16:29:55.476Z","paymentId":124}]	[{"title":"1 JAM WEEKDAYS","duration":0,"subtotal":25000,"isExtension":false,"ratePerHour":0,"logTime":"2026-06-15T14:28:20.413Z"},{"title":"Extend 1 JAM WEEKDAYS","duration":60,"subtotal":25000,"startTimeFormatted":"22.28","endTimeFormatted":"23.28","logTime":"2026-06-15T14:28:20.413Z"}]	\N	[]	4	4	4	\N	8	4	6	0	0.00	\N	\N	\N	0.00	0.00	2026-06-15 21:28:14.02241	2026-06-15 23:29:55.476401
135	TAB-260616113905	ICHI	\N	\N	3	\N	\N	PAID	BILLIARD	prepaid	3 JAM WEEKEND	2026-06-16 11:39:05.41	2026-06-16 15:39:28.439	\N	75000.00	22000.00	97000.00	0.00	0.00	0.00	0.00	97000.00	[{"method":"QRIS","amount":97000,"payer":"ICHI","timestamp":"2026-06-16T08:39:52.290Z","paymentId":138}]	[{"title":"3 JAM WEEKEND","duration":180,"subtotal":55000,"isExtension":false,"ratePerHour":55000,"startTimeFormatted":"11.39","endTimeFormatted":"14.39"},{"title":"Extend 1 JAM WEEKEND","duration":60,"subtotal":20000,"startTimeFormatted":"14.39","endTimeFormatted":"15.39","logTime":"2026-06-16T07:39:28.521Z"}]	\N	[]	3	3	3	\N	9	7	13	0	0.00	\N	\N	\N	0.00	0.00	2026-06-16 11:39:05.481365	2026-06-16 15:39:52.290939
132	TAB-260616101125	ANDI	\N	\N	2	\N	\N	PAID	BILLIARD	prepaid	1 JAM WEEKEND	2026-06-16 10:11:25.061	2026-06-16 12:11:25.061	\N	40000.00	14000.00	54000.00	0.00	0.00	0.00	0.00	54000.00	[{"method":"CASH","amount":54000,"payer":"ANDI","timestamp":"2026-06-16T05:12:05.507Z","paymentId":134}]	[{"title":"1 JAM WEEKEND","duration":0,"subtotal":20000,"isExtension":false,"ratePerHour":0,"logTime":"2026-06-16T03:11:46.243Z"},{"title":"Extend 1 JAM WEEKEND","duration":60,"subtotal":20000,"startTimeFormatted":"11.11","endTimeFormatted":"12.11","logTime":"2026-06-16T03:11:46.243Z"}]	\N	[]	3	3	3	\N	9	7	22	0	0.00	\N	\N	\N	0.00	0.00	2026-06-16 10:11:25.104804	2026-06-16 12:12:05.507979
125	TAB-260615205833	lerian	\N	\N	3	\N	\N	PAID	BILLIARD	open	OPEN TABLE WEEKDAYS	2026-06-15 20:58:33.509	2026-06-15 23:33:44.123	\N	65000.00	60000.00	125000.00	0.00	0.00	0.00	0.00	125000.00	[{"method":"CASH","amount":125000,"payer":"lerian","timestamp":"2026-06-15T16:34:27.207Z","paymentId":125}]	[{"title":"17:00-02:00","date":"15/06/2026","startTimeFormatted":"20.58","duration":156,"cost":64999.99999999985,"isExtension":false,"ratePerHour":25000,"subtotal":65000,"endTimeFormatted":"23.34"}]	\N	[]	4	4	4	\N	8	4	5	0	0.00	\N	\N	\N	0.00	0.00	2026-06-15 20:58:33.58886	2026-06-15 23:34:27.20734
128	TAB-260615214053	ANA	\N	\N	12	\N	\N	PAID	BILLIARD	prepaid	1 JAM WEEKDAYS	2026-06-15 21:40:53.543	2026-06-15 23:40:53.543	\N	80000.00	0.00	80000.00	0.00	0.00	0.00	0.00	80000.00	[{"method":"CASH","amount":80000,"payer":"ANA","timestamp":"2026-06-15T16:42:13.153Z","paymentId":126}]	[{"title":"1 JAM WEEKDAYS","duration":0,"subtotal":40000,"isExtension":false,"ratePerHour":0,"logTime":"2026-06-15T14:41:01.552Z"},{"title":"Extend 1 JAM WEEKDAYS","duration":60,"subtotal":40000,"startTimeFormatted":"22.40","endTimeFormatted":"23.40","logTime":"2026-06-15T14:41:01.552Z"}]	\N	[]	4	4	4	\N	8	4	2	0	0.00	\N	\N	\N	0.00	0.00	2026-06-15 21:40:53.589089	2026-06-15 23:42:13.153036
143	TAB-260616192131	IAN	\N	\N	1	\N	\N	PAID	BILLIARD	prepaid	1 JAM WEEKEND	2026-06-16 19:21:31.207	2026-06-16 20:21:31.207	\N	30000.00	0.00	30000.00	0.00	0.00	0.00	0.00	50000.00	[{"method":"CASH","amount":50000,"payer":"IAN","timestamp":"2026-06-16T13:23:14.637Z","paymentId":143}]	[{"title":"1 JAM WEEKEND","duration":60,"subtotal":30000,"isExtension":false,"ratePerHour":30000,"startTimeFormatted":"19.21","endTimeFormatted":"20.21"}]	\N	[]	4	4	4	\N	10	7	22	0	0.00	\N	\N	\N	0.00	0.00	2026-06-16 19:21:31.257425	2026-06-16 20:23:14.637551
145	TAB-260616193327	JAPA	\N	\N	3	\N	\N	PAID	BILLIARD	prepaid	1 JAM WEEKEND	2026-06-16 19:33:27.109	2026-06-16 21:33:27.109	\N	60000.00	15000.00	75000.00	0.00	0.00	0.00	0.00	100000.00	[{"method":"CASH","amount":100000,"payer":"JAPA","timestamp":"2026-06-16T14:35:43.657Z","paymentId":146}]	[{"title":"1 JAM WEEKEND","duration":0,"subtotal":30000,"isExtension":false,"ratePerHour":0,"logTime":"2026-06-16T12:33:30.760Z"},{"title":"Extend 1 JAM WEEKEND","duration":60,"subtotal":30000,"startTimeFormatted":"20.33","endTimeFormatted":"21.33","logTime":"2026-06-16T12:33:30.760Z"}]	\N	[]	4	4	4	\N	10	7	22	0	0.00	\N	\N	\N	0.00	0.00	2026-06-16 19:33:27.158919	2026-06-16 21:35:43.657613
155	TAB-260616233509	AMIR	\N	\N	5	\N	\N	PAID	BILLIARD	prepaid	1 JAM WEEKEND	2026-06-16 23:35:09.94	2026-06-17 01:35:09.94	\N	60000.00	26000.00	86000.00	0.00	0.00	0.00	0.00	100000.00	[{"method":"CASH","amount":100000,"payer":"AMIR","timestamp":"2026-06-16T18:36:58.624Z","paymentId":157}]	[{"title":"1 JAM WEEKEND","duration":0,"subtotal":30000,"isExtension":false,"ratePerHour":0,"logTime":"2026-06-16T16:35:20.298Z"},{"title":"Extend 1 JAM WEEKEND","duration":60,"subtotal":30000,"startTimeFormatted":"24.35","endTimeFormatted":"01.35","logTime":"2026-06-16T16:35:20.298Z"}]	\N	[]	4	4	4	\N	10	7	22	0	0.00	\N	\N	\N	0.00	0.00	2026-06-16 23:35:09.996906	2026-06-17 01:36:58.624882
151	TAB-260616211408	UNYIL	\N	\N	2	\N	\N	PAID	BILLIARD	open	OPEN TABLE WEEKEND	2026-06-16 21:14:08.714	2026-06-17 00:28:11.357	\N	97500.00	59000.00	156500.00	0.00	0.00	0.00	0.00	160000.00	[{"method":"CASH","amount":160000,"payer":"UNYIL","timestamp":"2026-06-16T17:31:03.148Z","paymentId":156}]	[{"title":"17:00-02:00","date":"16/06/2026","startTimeFormatted":"21.14","duration":166,"cost":83000.00000000001,"isExtension":false,"ratePerHour":30000,"subtotal":83000,"endTimeFormatted":"00.00"},{"title":"17:00-02:00","date":"17/06/2026","startTimeFormatted":"00.00","duration":29,"cost":14500.000000000002,"isExtension":false,"ratePerHour":30000,"subtotal":14500,"endTimeFormatted":"00.29"}]	\N	[]	4	4	4	\N	10	7	11	0	0.00	\N	\N	\N	0.00	0.00	2026-06-16 21:14:08.816996	2026-06-17 00:31:03.148138
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
1209	AWAY	2026-06-14 02:51:55.193	2026-06-14 03:17:22.324	1527	1
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
1592	ACTIVE	2026-06-15 18:33:58.726	\N	0	1
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
1232	OFFLINE	2026-06-14 03:17:22.324	2026-06-14 03:17:24.155	1	1
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
1365	ACTIVE	2026-06-14 20:57:43.447	\N	0	1
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
1233	ACTIVE	2026-06-14 03:17:24.155	2026-06-14 03:17:29.191	5	1
579	AWAY	2026-06-12 17:32:50.409	2026-06-12 17:33:44.264	53	4
1234	AWAY	2026-06-14 03:17:29.191	2026-06-14 03:18:06.621	37	1
1263	ACTIVE	2026-06-14 07:35:38.157	2026-06-14 07:37:39.582	121	5
1264	AWAY	2026-06-14 07:37:39.582	2026-06-14 07:37:44.178	4	5
1304	ACTIVE	2026-06-14 15:19:08.427	2026-06-14 15:20:43.747	95	1
1305	AWAY	2026-06-14 15:20:43.747	2026-06-14 15:20:43.858	0	1
1309	AWAY	2026-06-14 15:29:57.099	2026-06-14 15:31:22.118	85	3
1310	ACTIVE	2026-06-14 15:31:22.118	2026-06-14 15:41:32.1	609	3
1269	OFFLINE	2026-06-14 07:38:30.927	2026-06-14 18:22:03.971	38613	5
1306	OFFLINE	2026-06-14 15:20:43.858	2026-06-14 18:40:53.461	12009	1
1344	AWAY	2026-06-14 19:05:35.156	2026-06-14 19:11:05.25	330	4
1346	ACTIVE	2026-06-14 19:12:47.074	2026-06-14 19:12:52.367	5	5
1345	ACTIVE	2026-06-14 19:11:05.25	2026-06-14 19:31:45.196	1239	4
1366	ACTIVE	2026-06-14 20:57:43.472	2026-06-14 20:58:44.048	60	1
1395	AWAY	2026-06-14 23:32:50.15	2026-06-14 23:33:20.159	30	4
1425	ACTIVE	2026-06-15 01:58:19.968	2026-06-15 01:58:27.42	7	1
1593	ACTIVE	2026-06-15 18:33:58.744	2026-06-15 18:33:59.388	0	1
1613	ACTIVE	2026-06-15 20:25:25.91	2026-06-15 20:29:43.513	257	4
1451	AWAY	2026-06-15 09:43:06.446	2026-06-15 09:54:36.237	689	5
1468	AWAY	2026-06-15 10:10:08.728	2026-06-15 10:10:10.824	2	5
1469	ACTIVE	2026-06-15 10:10:10.824	2026-06-15 10:10:42.89	32	5
1446	OFFLINE	2026-06-15 06:36:39.447	2026-06-15 12:34:46.676	21487	1
1505	ACTIVE	2026-06-15 14:44:09.935	\N	0	5
1515	ACTIVE	2026-06-15 14:45:02.142	2026-06-15 14:45:20.504	18	5
1546	AWAY	2026-06-15 15:54:16.338	2026-06-15 16:02:56.395	520	4
1559	AWAY	2026-06-15 17:04:31.329	2026-06-15 17:20:36.394	965	4
1560	ACTIVE	2026-06-15 17:20:36.394	2026-06-15 17:25:04.335	267	4
1545	OFFLINE	2026-06-15 15:49:52.111	2026-06-15 18:21:08.174	9076	1
1570	ACTIVE	2026-06-15 18:21:08.174	2026-06-15 18:21:13.307	5	1
1615	AWAY	2026-06-15 20:29:43.513	2026-06-15 20:31:58.478	134	4
1620	ACTIVE	2026-06-15 20:46:35.451	\N	0	4
1621	ACTIVE	2026-06-15 20:46:35.473	2026-06-15 20:46:41.233	5	4
1622	AWAY	2026-06-15 20:46:41.233	2026-06-15 20:50:18.999	217	4
1650	AWAY	2026-06-15 23:44:08.203	2026-06-15 23:44:08.868	0	5
1653	OFFLINE	2026-06-15 23:44:30.368	2026-06-15 23:49:45.03	314	5
1687	ACTIVE	2026-06-16 00:22:43.922	2026-06-16 00:31:53.879	549	4
1689	ACTIVE	2026-06-16 00:40:57.907	2026-06-16 00:46:13.887	315	4
1681	ACTIVE	2026-06-15 23:54:16.138	2026-06-16 01:33:14.699	5938	5
1710	OFFLINE	2026-06-16 02:13:57.945	2026-06-16 02:20:23.423	385	1
1671	ACTIVE	2026-06-15 23:52:11.362	2026-06-16 10:16:48.502	37477	3
1739	ACTIVE	2026-06-16 11:30:38.507	2026-06-16 11:48:58.494	1099	3
1758	OFFLINE	2026-06-16 17:32:57.399	2026-06-16 17:33:05.038	7	3
1781	ACTIVE	2026-06-16 20:08:22.335	2026-06-16 20:08:35.439	13	5
1785	AWAY	2026-06-16 20:09:05.008	2026-06-16 20:11:35.027	150	4
1801	AWAY	2026-06-16 21:51:18.677	2026-06-16 23:21:44.415	5425	1
1823	AWAY	2026-06-16 23:48:09.983	2026-06-16 23:51:04.993	175	4
1857	AWAY	2026-06-17 01:02:04.997	2026-06-17 01:19:10.075	1025	4
1935	AWAY	2026-06-17 03:00:33.28	2026-06-17 03:00:53.088	19	1
1939	ACTIVE	2026-06-17 03:01:18.57	2026-06-17 03:03:08.743	110	1
1955	ACTIVE	2026-06-17 03:55:01.46	\N	0	1
581	ACTIVE	2026-06-12 17:33:44.264	2026-06-12 17:33:45.609	1	4
1235	ACTIVE	2026-06-14 03:18:06.621	2026-06-14 03:18:14.837	8	1
1237	ACTIVE	2026-06-14 03:18:15.757	2026-06-14 03:18:18.115	2	1
1266	ACTIVE	2026-06-14 07:37:44.502	2026-06-14 07:37:44.552	0	5
1308	ACTIVE	2026-06-14 15:22:12.11	2026-06-14 15:29:57.099	464	3
1348	AWAY	2026-06-14 19:31:45.196	2026-06-14 19:32:50.166	64	4
1594	AWAY	2026-06-15 18:33:59.388	2026-06-15 19:52:00.146	4680	1
1368	OFFLINE	2026-06-14 20:59:15.283	2026-06-14 21:00:06.534	51	1
1370	ACTIVE	2026-06-14 21:00:06.533	\N	0	1
1377	ACTIVE	2026-06-14 21:49:44.676	2026-06-14 21:49:50.037	5	5
1384	ACTIVE	2026-06-14 22:23:05.176	2026-06-14 22:35:35.166	749	4
1393	AWAY	2026-06-14 23:22:30.146	2026-06-14 23:22:50.151	20	4
1397	ACTIVE	2026-06-15 00:08:38.983	2026-06-15 00:08:46.738	7	1
1399	ACTIVE	2026-06-15 00:08:48.859	2026-06-15 00:08:53.685	4	1
1396	ACTIVE	2026-06-14 23:33:20.159	2026-06-15 00:12:57.747	2377	4
1403	AWAY	2026-06-15 00:12:57.714	2026-06-15 00:12:58.257	0	4
1411	ACTIVE	2026-06-15 01:02:17.862	\N	0	1
1618	ACTIVE	2026-06-15 20:45:03.482	2026-06-15 20:45:23.613	20	4
1426	AWAY	2026-06-15 01:58:27.42	2026-06-15 01:59:02.729	35	1
1408	ACTIVE	2026-06-15 00:13:04.638	2026-06-15 04:20:20.726	14836	4
1447	ACTIVE	2026-06-15 09:37:01.052	2026-06-15 09:37:26.097	25	5
1452	ACTIVE	2026-06-15 09:43:06.445	\N	0	5
1470	OFFLINE	2026-06-15 10:10:42.89	2026-06-15 10:11:07.965	25	5
1477	ACTIVE	2026-06-15 10:19:36.618	2026-06-15 10:20:46.736	70	5
1481	AWAY	2026-06-15 10:42:36.348	2026-06-15 10:55:06.399	750	4
1483	AWAY	2026-06-15 11:05:06.335	2026-06-15 11:22:06.368	1020	4
1478	OFFLINE	2026-06-15 10:20:46.736	2026-06-15 14:25:11.896	14665	5
1501	ACTIVE	2026-06-15 14:25:11.896	2026-06-15 14:25:28.668	16	5
1506	ACTIVE	2026-06-15 14:44:10.013	\N	0	5
1507	ACTIVE	2026-06-15 14:44:10.018	\N	0	5
1517	AWAY	2026-06-15 14:48:51.331	2026-06-15 14:50:16.351	85	4
1519	ACTIVE	2026-06-15 14:52:18.984	\N	0	5
1522	ACTIVE	2026-06-15 14:52:19.004	2026-06-15 14:52:28.358	9	5
1548	ACTIVE	2026-06-15 16:07:40.453	2026-06-15 16:07:41.1	0	5
1557	AWAY	2026-06-15 16:25:21.331	2026-06-15 16:48:31.486	1390	4
1558	ACTIVE	2026-06-15 16:48:31.486	2026-06-15 17:04:31.329	959	4
1564	ACTIVE	2026-06-15 17:36:23.533	2026-06-15 17:46:43.481	619	4
1566	ACTIVE	2026-06-15 17:49:03.613	2026-06-15 17:54:03.476	299	4
1571	AWAY	2026-06-15 18:21:13.307	2026-06-15 18:21:19.777	6	1
1569	AWAY	2026-06-15 18:16:38.479	2026-06-15 18:21:48.544	310	4
1628	ACTIVE	2026-06-15 20:57:14.292	2026-06-15 20:57:32.917	18	4
1652	ACTIVE	2026-06-15 23:44:27.565	2026-06-15 23:44:30.368	2	5
1677	ACTIVE	2026-06-15 23:53:27.077	2026-06-15 23:53:34.817	7	5
1696	ACTIVE	2026-06-16 01:39:12.806	2026-06-16 01:46:38.865	446	4
1699	OFFLINE	2026-06-16 02:01:47.061	2026-06-16 02:09:32.227	465	4
1712	ACTIVE	2026-06-16 02:20:23.423	2026-06-16 02:20:28.583	5	1
1713	AWAY	2026-06-16 02:20:28.583	2026-06-16 02:20:49.145	20	1
1714	ACTIVE	2026-06-16 02:20:49.145	2026-06-16 02:56:22.94	2133	1
1740	AWAY	2026-06-16 11:48:58.494	2026-06-16 11:53:53.497	295	3
1759	ACTIVE	2026-06-16 17:33:05.027	\N	0	3
1766	ACTIVE	2026-06-16 18:26:48.135	2026-06-16 18:42:24.978	936	4
1767	AWAY	2026-06-16 18:42:24.978	2026-06-16 18:52:45.232	620	4
1782	OFFLINE	2026-06-16 20:08:35.439	\N	0	5
1802	AWAY	2026-06-16 22:01:39.988	2026-06-16 22:03:35.033	115	4
1803	ACTIVE	2026-06-16 22:03:35.033	2026-06-16 22:17:34.997	839	4
1824	ACTIVE	2026-06-16 23:51:04.993	2026-06-17 00:02:09.985	664	4
1859	ACTIVE	2026-06-17 01:19:13.144	2026-06-17 01:19:18.439	5	5
1861	OFFLINE	2026-06-17 01:19:33.805	\N	0	5
1858	ACTIVE	2026-06-17 01:19:10.075	2026-06-17 01:24:14.972	304	4
1937	ACTIVE	2026-06-17 03:00:53.088	2026-06-17 03:01:13.214	20	1
1956	ACTIVE	2026-06-17 03:55:01.575	2026-06-17 03:55:05.761	4	1
582	AWAY	2026-06-12 17:33:45.609	2026-06-12 17:34:11.343	25	4
586	ACTIVE	2026-06-12 17:42:18.528	\N	0	1
1236	AWAY	2026-06-14 03:18:14.837	2026-06-14 03:18:15.755	0	1
1268	ACTIVE	2026-06-14 07:37:46.031	2026-06-14 07:38:30.927	44	5
1311	AWAY	2026-06-14 15:41:32.1	2026-06-14 15:44:47.115	195	3
1325	ACTIVE	2026-06-14 17:12:05.342	2026-06-14 17:24:25.223	739	4
1349	ACTIVE	2026-06-14 19:32:50.166	2026-06-14 19:53:05.147	1214	4
1369	ACTIVE	2026-06-14 21:00:06.456	\N	0	1
1375	ACTIVE	2026-06-14 21:16:35.247	2026-06-14 21:48:25.167	1909	4
1376	AWAY	2026-06-14 21:48:25.167	2026-06-14 21:56:10.255	465	4
1398	OFFLINE	2026-06-15 00:08:46.738	2026-06-15 00:08:48.859	2	1
1404	AWAY	2026-06-15 00:12:57.747	2026-06-15 00:12:58.215	0	4
1405	ACTIVE	2026-06-15 00:12:58.215	\N	0	4
1595	AWAY	2026-06-15 18:42:13.493	2026-06-15 18:58:27.939	974	4
1427	ACTIVE	2026-06-15 01:59:02.723	2026-06-15 03:48:11.823	6549	1
1619	AWAY	2026-06-15 20:45:23.613	2026-06-15 20:46:35.473	71	4
1448	OFFLINE	2026-06-15 09:37:26.097	2026-06-15 09:43:06.454	340	5
1472	OFFLINE	2026-06-15 10:11:22.018	2026-06-15 10:19:05.808	463	5
1509	AWAY	2026-06-15 14:44:10.017	\N	0	5
1510	OFFLINE	2026-06-15 14:44:23.302	2026-06-15 14:44:53.509	30	5
1323	OFFLINE	2026-06-14 17:11:59.018	2026-06-15 15:45:48.151	81229	3
1553	AWAY	2026-06-15 16:07:46.632	2026-06-15 16:08:51.707	65	5
1626	ACTIVE	2026-06-15 20:53:43.185	2026-06-15 20:56:25.071	161	4
1627	AWAY	2026-06-15 20:56:25.071	2026-06-15 20:57:14.292	49	4
1629	AWAY	2026-06-15 20:57:32.917	2026-06-15 20:57:40.193	7	4
1654	ACTIVE	2026-06-15 23:49:45.03	2026-06-15 23:49:54.617	9	5
1672	ACTIVE	2026-06-15 23:52:12.508	2026-06-15 23:53:07.698	55	5
1675	ACTIVE	2026-06-15 23:53:14.004	2026-06-15 23:53:15.806	1	5
1715	AWAY	2026-06-16 02:56:22.94	2026-06-16 03:20:10.022	1427	1
1741	ACTIVE	2026-06-16 11:53:53.497	2026-06-16 11:58:58.499	305	3
1762	ACTIVE	2026-06-16 18:00:05.049	2026-06-16 18:05:09.983	304	4
1783	OFFLINE	2026-06-16 20:08:35.468	2026-06-16 20:08:38.646	3	5
1784	ACTIVE	2026-06-16 20:08:38.646	2026-06-16 20:09:11.824	33	5
1804	AWAY	2026-06-16 22:17:34.997	2026-06-16 22:23:30.078	355	4
1825	ACTIVE	2026-06-16 23:59:00.544	2026-06-16 23:59:08.608	8	5
1862	AWAY	2026-06-17 01:24:14.972	2026-06-17 01:31:05.174	410	4
1940	AWAY	2026-06-17 03:03:08.743	2026-06-17 03:03:18.891	10	1
1958	ACTIVE	2026-06-17 03:55:06.838	2026-06-17 03:57:08.511	121	1
1961	ACTIVE	2026-06-17 03:57:19.963	2026-06-17 03:57:36.294	16	1
1968	AWAY	2026-06-17 03:59:16.542	2026-06-17 04:01:47.148	150	1
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
1655	AWAY	2026-06-15 23:49:54.592	\N	0	5
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
1239	AWAY	2026-06-14 03:18:18.115	\N	0	1
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
810	AWAY	2026-06-13 01:05:57.333	2026-06-13 01:05:57.787	0	4
814	AWAY	2026-06-13 01:06:03.053	2026-06-13 01:07:15.745	72	4
827	ACTIVE	2026-06-13 01:29:27.936	\N	0	5
811	OFFLINE	2026-06-13 01:05:57.355	2026-06-13 09:35:33.738	30576	3
812	ACTIVE	2026-06-13 01:05:57.787	2026-06-13 01:05:57.833	0	4
813	ACTIVE	2026-06-13 01:05:57.833	2026-06-13 01:06:03.053	5	4
818	ACTIVE	2026-06-13 01:07:15.745	2026-06-13 01:22:57.837	942	4
824	ACTIVE	2026-06-13 01:27:36.71	2026-06-13 01:28:46.843	70	4
772	ACTIVE	2026-06-13 00:16:23.741	2026-06-13 02:03:24.682	6420	1
845	OFFLINE	2026-06-13 02:03:24.682	2026-06-13 02:04:54.276	89	1
1238	ACTIVE	2026-06-14 03:18:15.755	2026-06-14 03:18:18.244	2	1
1240	OFFLINE	2026-06-14 03:18:18.244	2026-06-14 04:32:38.156	4459	1
1271	AWAY	2026-06-14 10:19:52.099	2026-06-14 10:29:02.204	550	3
1272	ACTIVE	2026-06-14 10:29:02.204	2026-06-14 10:36:22.13	439	3
1278	ACTIVE	2026-06-14 11:31:32.414	2026-06-14 11:38:02.121	389	3
1312	ACTIVE	2026-06-14 15:44:47.115	2026-06-14 15:59:57.111	909	3
1316	ACTIVE	2026-06-14 16:27:52.164	2026-06-14 16:40:17.12	744	3
1319	AWAY	2026-06-14 16:57:17.103	2026-06-14 16:57:32.12	15	3
1320	ACTIVE	2026-06-14 16:57:32.12	2026-06-14 17:02:57.118	324	3
1327	ACTIVE	2026-06-14 17:34:08.494	2026-06-14 17:49:20.145	911	4
1350	AWAY	2026-06-14 19:53:05.147	2026-06-14 19:56:35.182	210	4
1371	ACTIVE	2026-06-14 21:00:06.534	2026-06-14 21:00:09.873	3	1
1400	AWAY	2026-06-15 00:08:53.685	2026-06-15 00:09:15.052	21	1
1428	ACTIVE	2026-06-15 01:59:02.729	2026-06-15 01:59:30.784	28	1
1449	ACTIVE	2026-06-15 09:43:06.38	\N	0	5
1473	ACTIVE	2026-06-15 10:19:05.808	2026-06-15 10:19:06.402	0	5
1596	ACTIVE	2026-06-15 18:58:27.939	2026-06-15 19:02:27.856	239	4
1511	ACTIVE	2026-06-15 14:44:53.509	2026-06-15 14:44:53.59	0	5
1555	AWAY	2026-06-15 16:10:16.34	2026-06-15 16:19:46.395	570	4
1567	AWAY	2026-06-15 17:54:03.476	2026-06-15 18:00:23.555	380	4
1574	AWAY	2026-06-15 18:22:56.421	2026-06-15 18:28:22.507	326	4
1580	AWAY	2026-06-15 18:29:04.1	2026-06-15 18:29:43.661	39	1
1597	AWAY	2026-06-15 19:02:27.856	2026-06-15 19:04:21.24	113	4
1624	ACTIVE	2026-06-15 20:50:18.999	2026-06-15 20:53:42.776	203	4
1633	AWAY	2026-06-15 21:02:22.232	2026-06-15 21:02:35.122	12	1
1634	OFFLINE	2026-06-15 21:02:35.122	2026-06-15 22:05:58.864	3803	1
1631	ACTIVE	2026-06-15 20:57:40.193	2026-06-15 22:49:45.517	6725	4
1656	OFFLINE	2026-06-15 23:49:54.617	2026-06-15 23:50:00.578	5	5
1657	ACTIVE	2026-06-15 23:50:00.578	2026-06-15 23:50:04.763	4	5
1717	AWAY	2026-06-16 04:21:09.41	2026-06-16 04:21:11.587	2	1
1742	AWAY	2026-06-16 11:58:58.499	2026-06-16 12:01:48.495	169	3
1763	AWAY	2026-06-16 18:05:09.983	2026-06-16 18:18:50.036	820	4
1786	AWAY	2026-06-16 20:09:11.824	2026-06-16 20:09:16.716	4	5
1805	ACTIVE	2026-06-16 22:23:30.078	2026-06-16 22:28:49.985	319	4
1826	AWAY	2026-06-16 23:59:08.608	2026-06-16 23:59:26.121	17	5
1850	ACTIVE	2026-06-17 00:33:57.365	2026-06-17 00:34:00.17	2	5
1852	OFFLINE	2026-06-17 00:34:04.874	2026-06-17 00:34:14.496	9	5
1855	AWAY	2026-06-17 00:41:54.982	2026-06-17 00:54:05.153	730	4
1863	ACTIVE	2026-06-17 01:31:05.174	2026-06-17 01:41:42.724	637	4
1941	ACTIVE	2026-06-17 03:03:18.878	\N	0	1
1944	OFFLINE	2026-06-17 03:47:40.422	\N	0	3
1962	AWAY	2026-06-17 03:57:36.294	2026-06-17 03:57:44.72	8	1
1969	ACTIVE	2026-06-17 04:01:47.142	\N	0	1
1971	AWAY	2026-06-17 04:02:03.899	2026-06-17 04:02:07.511	3	1
1978	ACTIVE	2026-06-17 04:09:28.356	\N	0	1
1980	AWAY	2026-06-17 04:09:38.544	2026-06-17 04:10:45.263	66	1
790	OFFLINE	2026-06-13 01:00:57.764	2026-06-13 01:06:07.593	309	1
815	ACTIVE	2026-06-13 01:06:07.593	2026-06-13 01:06:12.729	5	1
822	ACTIVE	2026-06-13 01:23:49.305	2026-06-13 01:27:04.226	194	4
826	ACTIVE	2026-06-13 01:29:27.867	\N	0	5
809	OFFLINE	2026-06-13 01:05:34.407	2026-06-13 01:29:27.938	1433	5
836	ACTIVE	2026-06-13 01:46:26.609	2026-06-13 01:46:33.911	7	4
837	AWAY	2026-06-13 01:46:33.911	2026-06-13 01:48:33.537	119	4
1242	ACTIVE	2026-06-14 04:32:38.156	2026-06-14 04:32:43.388	5	1
1246	AWAY	2026-06-14 04:35:19.01	2026-06-14 04:35:20.359	1	5
1247	ACTIVE	2026-06-14 04:35:20.359	2026-06-14 04:36:24.978	64	5
1249	ACTIVE	2026-06-14 04:52:09.799	2026-06-14 04:52:14.545	4	1
1250	OFFLINE	2026-06-14 04:52:14.545	2026-06-14 04:52:16.759	2	1
1254	OFFLINE	2026-06-14 05:23:07.443	2026-06-14 07:29:29.193	7581	5
1276	ACTIVE	2026-06-14 11:11:45.665	2026-06-14 11:23:22.109	696	3
1277	AWAY	2026-06-14 11:23:22.109	2026-06-14 11:31:32.414	490	3
1283	ACTIVE	2026-06-14 11:51:17.21	2026-06-14 12:05:57.12	879	3
1314	ACTIVE	2026-06-14 16:00:27.139	2026-06-14 16:17:17.127	1009	3
1241	OFFLINE	2026-06-14 04:32:26.263	2026-06-14 17:12:05.209	45578	4
1324	ACTIVE	2026-06-14 17:12:05.209	2026-06-14 17:12:05.342	0	4
1351	ACTIVE	2026-06-14 19:56:35.182	2026-06-14 20:21:45.156	1509	4
1372	AWAY	2026-06-14 21:00:09.873	2026-06-14 21:00:13.633	3	1
1373	OFFLINE	2026-06-14 21:00:13.633	2026-06-14 23:07:56.047	7662	1
1402	AWAY	2026-06-15 00:10:42.023	2026-06-15 01:01:22.341	3040	1
1429	AWAY	2026-06-15 01:59:30.784	2026-06-15 03:46:38.395	6427	1
1450	ACTIVE	2026-06-15 09:43:06.442	\N	0	5
1475	ACTIVE	2026-06-15 10:19:08.754	2026-06-15 10:19:26.878	18	5
1485	AWAY	2026-06-15 11:29:21.339	2026-06-15 11:32:06.335	164	4
1514	OFFLINE	2026-06-15 14:45:01.827	2026-06-15 14:45:02.142	0	5
1561	OFFLINE	2026-06-15 17:25:04.335	2026-06-15 17:25:13.545	9	4
1581	ACTIVE	2026-06-15 18:29:43.645	\N	0	1
1598	ACTIVE	2026-06-15 19:04:21.214	\N	0	4
1625	AWAY	2026-06-15 20:53:42.776	2026-06-15 20:53:43.185	0	4
1632	ACTIVE	2026-06-15 21:02:15.548	2026-06-15 21:02:22.232	6	1
1658	AWAY	2026-06-15 23:50:04.763	2026-06-15 23:50:40.894	36	5
1659	OFFLINE	2026-06-15 23:50:40.894	2026-06-15 23:50:41.913	1	5
1685	ACTIVE	2026-06-16 00:09:48.907	2026-06-16 00:19:28.878	579	4
1702	ACTIVE	2026-06-16 02:09:37.527	\N	0	4
1719	AWAY	2026-06-16 04:23:07.092	2026-06-16 04:31:38.593	511	1
1743	ACTIVE	2026-06-16 12:01:48.495	2026-06-16 12:06:48.495	300	3
1764	ACTIVE	2026-06-16 18:18:50.036	2026-06-16 18:26:24.98	454	4
1806	AWAY	2026-06-16 22:28:49.985	2026-06-16 22:29:12.918	22	4
1787	OFFLINE	2026-06-16 20:09:16.716	2026-06-16 22:41:40.865	9144	5
1827	ACTIVE	2026-06-16 23:59:26.121	2026-06-16 23:59:27.84	1	5
1828	AWAY	2026-06-16 23:59:27.84	2026-06-16 23:59:32.901	5	5
1864	OFFLINE	2026-06-17 01:41:42.724	\N	0	4
1945	OFFLINE	2026-06-17 03:48:10.518	2026-06-17 03:50:49.14	158	1
1972	ACTIVE	2026-06-17 04:02:07.453	\N	0	1
816	AWAY	2026-06-13 01:06:12.729	2026-06-13 01:06:14.988	2	1
817	ACTIVE	2026-06-13 01:06:14.988	2026-06-13 01:08:04.245	109	1
819	AWAY	2026-06-13 01:08:04.245	2026-06-13 01:08:09.19	4	1
820	OFFLINE	2026-06-13 01:08:09.19	2026-06-13 01:31:09.623	1380	1
838	ACTIVE	2026-06-13 01:48:33.509	\N	0	4
843	ACTIVE	2026-06-13 02:03:00.998	2026-06-13 02:03:24.659	23	1
1243	AWAY	2026-06-14 04:32:43.388	2026-06-14 04:34:31.533	108	1
1280	ACTIVE	2026-06-14 11:34:54.509	2026-06-14 11:36:18.209	83	1
1281	AWAY	2026-06-14 11:36:18.209	2026-06-14 15:19:08.427	13370	1
1313	AWAY	2026-06-14 15:59:57.111	2026-06-14 16:00:27.139	30	3
1315	AWAY	2026-06-14 16:17:17.127	2026-06-14 16:27:52.164	635	3
1321	AWAY	2026-06-14 17:02:57.118	2026-06-14 17:04:55.311	118	3
1352	AWAY	2026-06-14 20:21:45.156	2026-06-14 20:22:45.168	60	4
1374	AWAY	2026-06-14 21:09:35.183	2026-06-14 21:16:35.247	420	4
1407	AWAY	2026-06-15 00:13:03.455	2026-06-15 00:13:04.638	1	4
1430	ACTIVE	2026-06-15 03:46:38.395	2026-06-15 03:46:43.298	4	1
1453	ACTIVE	2026-06-15 09:43:06.454	2026-06-15 09:45:36.736	150	5
1476	OFFLINE	2026-06-15 10:19:26.878	2026-06-15 10:19:36.618	9	5
1523	ACTIVE	2026-06-15 14:52:18.991	\N	0	5
1562	ACTIVE	2026-06-15 17:25:13.545	2026-06-15 17:31:03.542	349	4
1599	ACTIVE	2026-06-15 19:04:21.24	2026-06-15 19:21:18.472	1017	4
1600	AWAY	2026-06-15 19:21:18.472	2026-06-15 19:30:53.519	575	4
1635	ACTIVE	2026-06-15 22:05:58.864	2026-06-15 22:06:06.277	7	1
1660	ACTIVE	2026-06-15 23:50:41.913	2026-06-15 23:50:46.879	4	5
1663	ACTIVE	2026-06-15 23:50:49.07	2026-06-15 23:50:49.511	0	5
1664	OFFLINE	2026-06-15 23:50:49.511	2026-06-15 23:50:55.286	5	5
1670	OFFLINE	2026-06-15 23:51:37.006	2026-06-15 23:52:11.362	34	3
1720	OFFLINE	2026-06-16 04:31:38.593	2026-06-16 04:31:40.134	1	1
1722	OFFLINE	2026-06-16 05:18:50.113	2026-06-16 05:18:51.901	1	1
1723	ACTIVE	2026-06-16 05:18:51.901	2026-06-16 07:13:43.677	6891	1
1744	AWAY	2026-06-16 12:06:48.495	2026-06-16 12:09:33.527	165	3
1765	AWAY	2026-06-16 18:26:24.98	2026-06-16 18:26:48.135	23	4
1788	ACTIVE	2026-06-16 20:11:35.027	2026-06-16 20:18:44.989	429	4
1807	ACTIVE	2026-06-16 22:29:12.918	2026-06-16 22:34:29.976	317	4
1829	OFFLINE	2026-06-16 23:59:32.901	2026-06-16 23:59:34.888	1	5
1831	ACTIVE	2026-06-16 23:59:35.168	2026-06-16 23:59:49.323	14	5
1865	ACTIVE	2026-06-17 02:39:18.294	2026-06-17 02:43:35.8	257	1
1924	AWAY	2026-06-17 02:50:42.844	2026-06-17 02:51:23.334	40	1
1973	ACTIVE	2026-06-17 04:02:07.511	2026-06-17 04:02:10.979	3	1
821	AWAY	2026-06-13 01:22:57.837	2026-06-13 01:23:49.305	51	4
825	AWAY	2026-06-13 01:28:46.843	2026-06-13 01:30:37.604	110	4
1244	OFFLINE	2026-06-14 04:34:31.533	2026-06-14 04:52:09.799	1058	1
1253	ACTIVE	2026-06-14 05:22:34.471	2026-06-14 05:23:07.443	32	5
1282	AWAY	2026-06-14 11:38:02.121	2026-06-14 11:51:17.21	795	3
1317	AWAY	2026-06-14 16:40:17.12	2026-06-14 16:52:17.191	720	3
1353	ACTIVE	2026-06-14 20:22:45.168	2026-06-14 20:29:15.162	389	4
1378	AWAY	2026-06-14 21:49:50.037	2026-06-14 21:50:43.582	53	5
1383	AWAY	2026-06-14 22:21:00.147	2026-06-14 22:23:05.176	125	4
1387	ACTIVE	2026-06-14 23:07:56.047	2026-06-14 23:08:01.403	5	1
1409	ACTIVE	2026-06-15 01:01:22.341	2026-06-15 01:01:24.765	2	1
1415	ACTIVE	2026-06-15 01:02:47.951	2026-06-15 01:03:05.736	17	1
1431	AWAY	2026-06-15 03:46:43.298	2026-06-15 03:47:20.336	37	1
1454	OFFLINE	2026-06-15 09:45:36.736	2026-06-15 09:54:36.188	539	5
1479	AWAY	2026-06-15 10:36:11.342	2026-06-15 10:36:16.351	5	4
1480	ACTIVE	2026-06-15 10:36:16.351	2026-06-15 10:42:36.348	379	4
1524	OFFLINE	2026-06-15 14:52:28.358	2026-06-15 16:07:40.453	4512	5
1563	AWAY	2026-06-15 17:31:03.542	2026-06-15 17:36:23.533	319	4
1565	AWAY	2026-06-15 17:46:43.481	2026-06-15 17:49:03.613	140	4
1568	ACTIVE	2026-06-15 18:00:23.555	2026-06-15 18:16:38.479	974	4
1601	ACTIVE	2026-06-15 19:30:53.519	2026-06-15 19:47:08.578	975	4
1606	ACTIVE	2026-06-15 19:52:02.528	2026-06-15 20:26:18.603	2056	1
1636	AWAY	2026-06-15 22:06:06.277	2026-06-15 22:06:33.241	26	1
1661	AWAY	2026-06-15 23:50:46.879	2026-06-15 23:50:47.505	0	5
1676	AWAY	2026-06-15 23:53:15.806	2026-06-15 23:53:27.077	11	5
1678	AWAY	2026-06-15 23:53:34.817	2026-06-15 23:53:43.692	8	5
1724	OFFLINE	2026-06-16 07:13:43.677	2026-06-16 07:13:45.336	1	1
1725	ACTIVE	2026-06-16 07:13:45.336	2026-06-16 08:19:40.543	3955	1
1745	ACTIVE	2026-06-16 12:09:33.527	2026-06-16 12:18:03.696	510	3
1768	ACTIVE	2026-06-16 18:52:45.232	2026-06-16 19:04:29.968	704	4
1674	ACTIVE	2026-06-15 23:53:13.964	2026-06-16 20:08:35.468	72921	5
1789	AWAY	2026-06-16 20:18:44.989	2026-06-16 20:19:00.165	15	4
1808	AWAY	2026-06-16 22:34:29.976	2026-06-16 22:35:39.98	70	4
1830	ACTIVE	2026-06-16 23:59:34.888	2026-06-16 23:59:35.166	0	5
1834	OFFLINE	2026-06-16 23:59:54.237	2026-06-17 00:00:20.331	26	5
1866	AWAY	2026-06-17 02:43:35.8	2026-06-17 02:44:24.49	48	1
1870	AWAY	2026-06-17 02:44:46.159	2026-06-17 02:45:16.938	30	1
1928	AWAY	2026-06-17 02:52:09.762	2026-06-17 03:00:12.7	482	1
1938	OFFLINE	2026-06-17 03:01:13.214	2026-06-17 03:01:18.57	5	1
1977	AWAY	2026-06-17 04:06:00.272	2026-06-17 04:09:28.446	208	1
823	AWAY	2026-06-13 01:27:04.226	2026-06-13 01:27:36.71	32	4
847	AWAY	2026-06-13 02:04:59.39	2026-06-13 02:12:23.491	444	1
1245	ACTIVE	2026-06-14 04:35:13.741	2026-06-14 04:35:19.01	5	5
1284	AWAY	2026-06-14 12:05:57.12	2026-06-14 12:13:32.157	455	3
1326	AWAY	2026-06-14 17:24:25.223	2026-06-14 17:34:08.494	583	4
1354	AWAY	2026-06-14 20:29:15.162	2026-06-14 20:34:30.44	315	4
1380	ACTIVE	2026-06-14 21:56:10.255	2026-06-14 22:10:55.149	884	4
1410	AWAY	2026-06-15 01:01:24.765	2026-06-15 01:02:17.891	53	1
1432	ACTIVE	2026-06-15 03:47:20.336	2026-06-15 03:48:11.178	50	1
1433	AWAY	2026-06-15 03:48:11.178	2026-06-15 03:48:11.678	0	1
1435	ACTIVE	2026-06-15 03:48:11.784	\N	0	1
1379	OFFLINE	2026-06-14 21:50:43.582	2026-06-15 09:37:01.052	42377	5
1455	ACTIVE	2026-06-15 09:54:36.09	\N	0	5
1484	ACTIVE	2026-06-15 11:22:06.368	2026-06-15 11:29:21.339	434	4
1525	AWAY	2026-06-15 15:04:02.45	2026-06-15 15:04:52.325	49	4
1572	ACTIVE	2026-06-15 18:21:19.777	2026-06-15 18:27:38.411	378	1
1576	ACTIVE	2026-06-15 18:28:22.507	2026-06-15 18:28:22.705	0	4
1602	AWAY	2026-06-15 19:47:08.578	2026-06-15 19:47:36.767	28	4
1637	ACTIVE	2026-06-15 22:06:33.241	2026-06-15 22:08:45.372	132	1
1667	OFFLINE	2026-06-15 23:51:22.155	2026-06-15 23:51:26.86	4	4
1669	ACTIVE	2026-06-15 23:51:28.106	2026-06-15 23:51:37.006	8	3
1668	ACTIVE	2026-06-15 23:51:26.86	2026-06-15 23:58:43.892	437	4
1726	OFFLINE	2026-06-16 08:19:40.543	2026-06-16 08:19:41.844	1	1
1769	AWAY	2026-06-16 19:04:29.968	2026-06-16 19:09:04.997	275	4
1790	ACTIVE	2026-06-16 20:19:00.165	2026-06-16 20:41:14.999	1334	4
1809	ACTIVE	2026-06-16 22:35:39.98	2026-06-16 22:42:34.992	415	4
1833	AWAY	2026-06-16 23:59:49.323	2026-06-16 23:59:54.237	4	5
1832	ACTIVE	2026-06-16 23:59:35.166	2026-06-17 00:00:36.03	60	5
1867	ACTIVE	2026-06-17 02:44:24.453	\N	0	1
1881	ACTIVE	2026-06-17 02:46:12.2	\N	0	1
1909	AWAY	2026-06-17 02:50:01.828	2026-06-17 02:50:05.824	3	1
1910	ACTIVE	2026-06-17 02:50:05.806	\N	0	1
1913	ACTIVE	2026-06-17 02:50:18.277	\N	0	1
1915	AWAY	2026-06-17 02:50:19.907	2026-06-17 02:50:22.042	2	1
1916	ACTIVE	2026-06-17 02:50:22.017	\N	0	1
1918	AWAY	2026-06-17 02:50:23.191	2026-06-17 02:50:24.326	1	1
1926	ACTIVE	2026-06-17 02:51:23.327	2026-06-17 03:00:13.065	529	1
1936	ACTIVE	2026-06-17 03:00:53.073	\N	0	1
1981	ACTIVE	2026-06-17 04:10:45.184	\N	0	1
1991	AWAY	2026-06-17 04:11:47.471	2026-06-17 04:11:51.313	3	1
1992	ACTIVE	2026-06-17 04:11:51.313	2026-06-17 04:14:08.263	136	1
830	ACTIVE	2026-06-13 01:31:09.623	2026-06-13 01:31:14.425	4	1
828	ACTIVE	2026-06-13 01:29:27.938	2026-06-13 01:31:17.655	109	5
829	ACTIVE	2026-06-13 01:30:37.604	2026-06-13 01:37:37.782	420	4
839	ACTIVE	2026-06-13 01:48:33.537	2026-06-13 01:48:37.157	3	4
842	ACTIVE	2026-06-13 01:48:40.386	2026-06-13 02:05:44.24	1023	4
1248	OFFLINE	2026-06-14 04:36:24.978	2026-06-14 05:22:34.471	2769	5
1285	ACTIVE	2026-06-14 12:13:32.157	2026-06-14 12:19:12.122	339	3
1328	AWAY	2026-06-14 17:49:20.145	2026-06-14 18:02:40.212	800	4
1355	ACTIVE	2026-06-14 20:34:30.44	2026-06-14 20:39:45.153	314	4
1381	AWAY	2026-06-14 22:10:55.149	2026-06-14 22:11:40.146	44	4
1412	ACTIVE	2026-06-15 01:02:17.891	2026-06-15 01:02:24.802	6	1
1603	ACTIVE	2026-06-15 19:47:36.724	\N	0	4
1416	AWAY	2026-06-15 01:03:05.736	2026-06-15 01:20:14.354	1028	1
1421	AWAY	2026-06-15 01:21:35.262	2026-06-15 01:21:48.496	13	1
1434	ACTIVE	2026-06-15 03:48:11.678	\N	0	1
1456	AWAY	2026-06-15 09:54:36.188	\N	0	5
1486	ACTIVE	2026-06-15 11:32:06.335	2026-06-15 11:37:21.329	314	4
1526	ACTIVE	2026-06-15 15:04:52.303	\N	0	4
1536	ACTIVE	2026-06-15 15:37:09.443	2026-06-15 15:40:52.85	223	1
1547	ACTIVE	2026-06-15 16:02:56.395	2026-06-15 16:10:16.34	439	4
1573	ACTIVE	2026-06-15 18:21:48.544	2026-06-15 18:22:56.421	67	4
1575	AWAY	2026-06-15 18:27:38.411	2026-06-15 18:28:28.551	50	1
1638	AWAY	2026-06-15 22:08:45.372	2026-06-15 22:09:05.895	20	1
1673	OFFLINE	2026-06-15 23:53:07.698	2026-06-15 23:53:14.004	6	5
1680	AWAY	2026-06-15 23:53:44.778	2026-06-15 23:54:16.138	31	5
1683	ACTIVE	2026-06-16 00:00:04.006	2026-06-16 00:06:58.87	414	4
1695	AWAY	2026-06-16 01:33:14.699	2026-06-16 02:10:03.099	2208	5
1727	ACTIVE	2026-06-16 08:19:41.844	2026-06-16 14:03:11.769	20609	1
1770	ACTIVE	2026-06-16 19:09:04.997	2026-06-16 19:14:35.031	330	4
1791	OFFLINE	2026-06-16 20:35:28.489	2026-06-16 20:35:31.427	2	1
1792	ACTIVE	2026-06-16 20:35:31.427	2026-06-16 21:01:11.358	1539	1
1810	ACTIVE	2026-06-16 22:41:40.865	2026-06-16 22:41:42.14	1	5
1811	AWAY	2026-06-16 22:41:42.14	2026-06-16 22:41:42.728	0	5
1813	AWAY	2026-06-16 22:42:34.992	2026-06-16 22:45:24.995	170	4
1812	OFFLINE	2026-06-16 22:41:42.728	2026-06-16 23:59:00.544	4637	5
1835	ACTIVE	2026-06-17 00:00:20.331	2026-06-17 00:00:36.004	15	5
1842	ACTIVE	2026-06-17 00:03:18.289	2026-06-17 00:17:24.975	846	4
1849	OFFLINE	2026-06-17 00:33:52.985	2026-06-17 00:33:57.365	4	5
1844	ACTIVE	2026-06-17 00:22:35.197	2026-06-17 00:41:54.982	1159	4
1854	OFFLINE	2026-06-17 00:34:15.217	2026-06-17 01:19:13.144	2697	5
1868	ACTIVE	2026-06-17 02:44:24.46	\N	0	1
1875	ACTIVE	2026-06-17 02:45:41.28	2026-06-17 02:45:58.412	17	1
1876	AWAY	2026-06-17 02:45:58.412	2026-06-17 02:46:00.181	1	1
1877	ACTIVE	2026-06-17 02:46:00.165	\N	0	1
1884	ACTIVE	2026-06-17 02:47:00.113	2026-06-17 02:47:38.794	38	1
1891	AWAY	2026-06-17 02:48:07.388	2026-06-17 02:48:19.722	12	1
1901	ACTIVE	2026-06-17 02:49:02.158	\N	0	1
1903	AWAY	2026-06-17 02:49:25.584	2026-06-17 02:49:28.906	3	1
1905	ACTIVE	2026-06-17 02:49:28.906	2026-06-17 02:49:30.597	1	1
1930	ACTIVE	2026-06-17 03:00:13.195	2026-06-17 03:00:22.483	9	1
1932	AWAY	2026-06-17 03:00:22.483	2026-06-17 03:00:29.706	7	1
1934	ACTIVE	2026-06-17 03:00:29.706	2026-06-17 03:00:33.28	3	1
1943	AWAY	2026-06-17 03:03:46.238	2026-06-17 03:48:10.518	2664	1
1982	ACTIVE	2026-06-17 04:10:45.263	2026-06-17 04:10:47.935	2	1
831	AWAY	2026-06-13 01:31:14.425	2026-06-13 01:31:18.285	3	1
834	OFFLINE	2026-06-13 01:31:22.518	2026-06-13 02:38:07.895	4005	5
1251	ACTIVE	2026-06-14 04:52:16.759	2026-06-14 04:59:34.513	437	1
1286	AWAY	2026-06-14 12:19:12.122	2026-06-14 12:35:12.189	960	3
1292	AWAY	2026-06-14 13:07:07.132	2026-06-14 13:12:47.189	340	3
1329	ACTIVE	2026-06-14 18:02:40.212	2026-06-14 18:18:40.165	959	4
1356	AWAY	2026-06-14 20:39:45.153	2026-06-14 20:40:15.186	30	4
1382	ACTIVE	2026-06-14 22:11:40.146	2026-06-14 22:21:00.147	560	4
1413	AWAY	2026-06-15 01:02:24.802	2026-06-15 01:02:47.951	23	1
1436	ACTIVE	2026-06-15 03:48:11.823	2026-06-15 03:48:16.84	5	1
1589	AWAY	2026-06-15 18:33:14.963	2026-06-15 18:33:58.744	43	1
1437	AWAY	2026-06-15 03:48:16.84	2026-06-15 03:48:23.203	6	1
1442	ACTIVE	2026-06-15 04:21:11.365	2026-06-15 04:21:16.513	5	4
1457	ACTIVE	2026-06-15 09:54:36.235	\N	0	5
1488	ACTIVE	2026-06-15 12:11:11.407	2026-06-15 12:17:26.37	374	4
1527	ACTIVE	2026-06-15 15:04:52.325	2026-06-15 15:11:51.331	419	4
1577	ACTIVE	2026-06-15 18:28:22.705	2026-06-15 18:28:28.207	5	4
1579	ACTIVE	2026-06-15 18:28:28.551	2026-06-15 18:29:04.1	35	1
1604	ACTIVE	2026-06-15 19:47:36.767	2026-06-15 19:53:38.475	361	4
1639	OFFLINE	2026-06-15 22:09:05.895	2026-06-15 23:09:35.619	3629	1
1679	ACTIVE	2026-06-15 23:53:43.692	2026-06-15 23:53:44.778	1	5
1697	AWAY	2026-06-16 01:46:38.865	2026-06-16 01:52:37.736	358	4
1700	ACTIVE	2026-06-16 02:09:32.227	2026-06-16 02:09:34.843	2	4
1703	ACTIVE	2026-06-16 02:09:37.536	2026-06-16 02:09:42.752	5	4
1716	ACTIVE	2026-06-16 03:20:10.022	2026-06-16 04:21:09.41	3659	1
1728	AWAY	2026-06-16 10:16:48.502	2026-06-16 10:27:38.634	650	3
1771	AWAY	2026-06-16 19:14:35.031	2026-06-16 19:17:10	154	4
1772	ACTIVE	2026-06-16 19:17:10	2026-06-16 19:32:04.987	894	4
1793	AWAY	2026-06-16 20:41:14.999	2026-06-16 20:53:05.114	710	4
1814	ACTIVE	2026-06-16 22:45:24.995	2026-06-16 22:53:19.996	475	4
1836	AWAY	2026-06-17 00:00:36.004	\N	0	5
1840	OFFLINE	2026-06-17 00:00:59.624	2026-06-17 00:32:35.86	1896	5
1869	ACTIVE	2026-06-17 02:44:24.49	2026-06-17 02:44:46.159	21	1
1895	ACTIVE	2026-06-17 02:48:37.373	\N	0	1
1899	ACTIVE	2026-06-17 02:48:48.255	2026-06-17 02:48:51.126	2	1
1907	ACTIVE	2026-06-17 02:49:45.369	\N	0	1
1929	ACTIVE	2026-06-17 03:00:12.7	2026-06-17 03:00:13.195	0	1
1983	AWAY	2026-06-17 04:10:47.935	2026-06-17 04:10:49.113	1	1
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
927	AWAY	2026-06-13 03:09:29.347	2026-06-13 03:23:13.984	824	1
935	ACTIVE	2026-06-13 03:23:13.984	2026-06-13 03:24:10.943	56	1
942	ACTIVE	2026-06-13 03:30:28.799	2026-06-13 03:30:33.633	4	4
936	AWAY	2026-06-13 03:24:10.943	2026-06-13 03:24:15.973	5	1
938	ACTIVE	2026-06-13 03:24:15.973	2026-06-13 03:24:35.73	19	1
922	ACTIVE	2026-06-13 03:08:13.384	2026-06-13 03:30:07.379	1313	4
940	OFFLINE	2026-06-13 03:30:07.379	2026-06-13 03:30:28.799	21	4
941	ACTIVE	2026-06-13 03:30:28.781	\N	0	4
943	AWAY	2026-06-13 03:30:33.633	2026-06-13 03:30:33.686	0	4
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
944	OFFLINE	2026-06-13 03:30:33.686	2026-06-13 18:00:55.558	52221	4
957	AWAY	2026-06-13 03:46:20.332	2026-06-13 03:47:00.628	40	1
1591	ACTIVE	2026-06-15 18:33:37.28	2026-06-15 18:42:13.493	516	4
959	ACTIVE	2026-06-13 03:47:00.628	2026-06-13 03:53:01.735	361	1
970	AWAY	2026-06-13 03:58:57.007	\N	0	1
1252	AWAY	2026-06-14 04:59:34.513	2026-06-14 11:34:54.509	23719	1
1287	ACTIVE	2026-06-14 12:35:12.189	2026-06-14 12:46:52.115	699	3
1330	AWAY	2026-06-14 18:18:40.165	2026-06-14 18:18:55.154	14	4
1332	ACTIVE	2026-06-14 18:22:03.971	2026-06-14 18:23:20.239	76	5
1331	ACTIVE	2026-06-14 18:18:55.154	2026-06-14 18:31:25.192	750	4
1334	OFFLINE	2026-06-14 18:23:27.935	2026-06-14 19:12:47.074	2959	5
1357	ACTIVE	2026-06-14 20:40:15.186	2026-06-14 21:09:35.183	1759	4
1385	AWAY	2026-06-14 22:35:35.166	2026-06-14 22:36:25.164	49	4
1414	ACTIVE	2026-06-15 01:02:47.93	\N	0	1
1438	ACTIVE	2026-06-15 03:48:23.194	\N	0	1
1458	AWAY	2026-06-15 09:54:36.236	\N	0	5
1490	ACTIVE	2026-06-15 12:19:29.096	2026-06-15 12:49:06.341	1777	4
1504	ACTIVE	2026-06-15 14:43:51.599	2026-06-15 14:48:51.331	299	4
1528	AWAY	2026-06-15 15:11:51.331	2026-06-15 15:19:41.419	470	4
1533	ACTIVE	2026-06-15 15:34:45.85	2026-06-15 15:36:25.886	100	1
1534	AWAY	2026-06-15 15:36:25.886	2026-06-15 15:37:09.443	43	1
1539	ACTIVE	2026-06-15 15:43:56.479	2026-06-15 15:54:16.338	619	4
1605	OFFLINE	2026-06-15 19:52:00.146	2026-06-15 19:52:02.528	2	1
1578	AWAY	2026-06-15 18:28:28.207	2026-06-15 18:33:07.66	279	4
1584	ACTIVE	2026-06-15 18:33:07.638	\N	0	4
1588	ACTIVE	2026-06-15 18:33:12.891	2026-06-15 18:33:14.963	2	1
1640	AWAY	2026-06-15 22:49:45.517	2026-06-15 22:56:42.975	417	4
1684	AWAY	2026-06-16 00:06:58.87	2026-06-16 00:09:48.907	170	4
1688	AWAY	2026-06-16 00:31:53.879	2026-06-16 00:40:57.907	544	4
1693	AWAY	2026-06-16 01:13:58.069	2026-06-16 01:14:00.845	2	1
1729	ACTIVE	2026-06-16 10:27:38.634	2026-06-16 10:33:18.481	339	3
1747	ACTIVE	2026-06-16 12:32:25.457	\N	0	3
1752	OFFLINE	2026-06-16 14:03:11.769	2026-06-16 14:03:14.699	2	1
1753	ACTIVE	2026-06-16 14:03:14.699	2026-06-16 16:15:37.231	7942	1
1751	ACTIVE	2026-06-16 12:34:22.055	2026-06-16 17:32:57.399	17915	3
1773	AWAY	2026-06-16 19:32:04.987	2026-06-16 19:32:09.978	4	4
1794	ACTIVE	2026-06-16 20:53:05.114	2026-06-16 21:24:59.967	1914	4
1815	AWAY	2026-06-16 22:53:19.996	2026-06-16 22:53:30.017	10	4
1837	OFFLINE	2026-06-17 00:00:36.03	2026-06-17 00:00:38.615	2	5
1871	ACTIVE	2026-06-17 02:45:16.914	\N	0	1
1873	AWAY	2026-06-17 02:45:26.258	2026-06-17 02:45:41.28	15	1
1911	ACTIVE	2026-06-17 02:50:05.824	2026-06-17 02:50:12.569	6	1
1946	ACTIVE	2026-06-17 03:50:49.14	2026-06-17 03:51:55.215	66	1
1984	ACTIVE	2026-06-17 04:10:49.106	\N	0	1
960	AWAY	2026-06-13 03:53:01.692	\N	0	1
966	AWAY	2026-06-13 03:55:10.636	2026-06-13 03:55:12.923	2	1
1255	ACTIVE	2026-06-14 07:29:29.193	2026-06-14 07:29:29.23	0	5
1288	AWAY	2026-06-14 12:46:52.115	2026-06-14 12:50:47.143	235	3
1289	ACTIVE	2026-06-14 12:50:47.143	2026-06-14 13:00:37.133	589	3
1290	AWAY	2026-06-14 13:00:37.133	2026-06-14 13:02:02.138	85	3
1333	AWAY	2026-06-14 18:23:20.239	2026-06-14 18:23:27.935	7	5
1279	ACTIVE	2026-06-14 11:34:54.486	2026-06-14 18:40:53.52	25559	1
1358	ACTIVE	2026-06-14 20:45:24.147	\N	0	1
1386	ACTIVE	2026-06-14 22:36:25.164	2026-06-14 23:22:30.146	2764	4
1417	ACTIVE	2026-06-15 01:20:14.339	\N	0	1
1439	ACTIVE	2026-06-15 03:48:23.203	2026-06-15 03:48:37.893	14	1
1459	ACTIVE	2026-06-15 09:54:36.237	2026-06-15 09:54:40.798	4	5
1494	ACTIVE	2026-06-15 13:18:41.429	2026-06-15 13:24:06.329	324	4
1529	ACTIVE	2026-06-15 15:19:41.419	2026-06-15 15:24:46.336	304	4
1492	OFFLINE	2026-06-15 12:34:51.546	2026-06-15 15:34:45.85	10794	1
1537	AWAY	2026-06-15 15:40:52.85	2026-06-15 15:43:30.284	157	1
1540	OFFLINE	2026-06-15 15:45:40.171	2026-06-15 15:46:15.583	35	1
1582	ACTIVE	2026-06-15 18:29:43.661	2026-06-15 18:29:44.556	0	1
1607	AWAY	2026-06-15 19:53:38.475	2026-06-15 19:58:18.518	280	4
1641	ACTIVE	2026-06-15 22:56:42.975	\N	0	4
1686	AWAY	2026-06-16 00:19:28.878	2026-06-16 00:22:43.922	195	4
1701	AWAY	2026-06-16 02:09:34.843	2026-06-16 02:09:37.536	2	4
1694	OFFLINE	2026-06-16 01:14:00.845	2026-06-16 02:13:26.576	3565	1
1730	AWAY	2026-06-16 10:33:18.481	2026-06-16 10:43:43.659	625	3
1735	ACTIVE	2026-06-16 11:15:08.633	2026-06-16 11:20:38.534	329	3
1748	ACTIVE	2026-06-16 12:32:25.493	2026-06-16 12:32:30.86	5	3
1774	ACTIVE	2026-06-16 19:32:09.978	2026-06-16 19:44:29.982	740	4
1776	ACTIVE	2026-06-16 19:36:21.49	2026-06-16 20:35:28.489	3546	1
1795	OFFLINE	2026-06-16 21:01:11.358	2026-06-16 21:01:13.956	2	1
1816	ACTIVE	2026-06-16 22:53:30.017	2026-06-16 23:07:05.015	814	4
1838	ACTIVE	2026-06-17 00:00:38.615	2026-06-17 00:00:43.26	4	5
1845	ACTIVE	2026-06-17 00:32:35.86	2026-06-17 00:32:40.742	4	5
1847	ACTIVE	2026-06-17 00:32:49.956	2026-06-17 00:33:48.154	58	5
1848	AWAY	2026-06-17 00:33:48.154	2026-06-17 00:33:52.985	4	5
1856	ACTIVE	2026-06-17 00:54:05.153	2026-06-17 01:02:04.997	479	4
1872	ACTIVE	2026-06-17 02:45:16.938	2026-06-17 02:45:26.258	9	1
1879	AWAY	2026-06-17 02:46:05.262	2026-06-17 02:46:12.2	6	1
1889	ACTIVE	2026-06-17 02:47:53.641	\N	0	1
1897	AWAY	2026-06-17 02:48:45.176	2026-06-17 02:48:48.255	3	1
1898	ACTIVE	2026-06-17 02:48:48.243	\N	0	1
1900	AWAY	2026-06-17 02:48:51.126	2026-06-17 02:49:02.174	11	1
1908	ACTIVE	2026-06-17 02:49:45.382	2026-06-17 02:50:01.828	16	1
1947	AWAY	2026-06-17 03:51:55.215	2026-06-17 03:52:06.153	10	1
1957	AWAY	2026-06-17 03:55:05.761	2026-06-17 03:55:06.838	1	1
1985	ACTIVE	2026-06-17 04:10:49.113	2026-06-17 04:10:53.282	4	1
962	ACTIVE	2026-06-13 03:53:02.583	\N	0	1
961	OFFLINE	2026-06-13 03:53:01.735	2026-06-13 03:53:02.801	1	1
964	AWAY	2026-06-13 03:53:07.373	2026-06-13 03:53:10.15	2	1
965	ACTIVE	2026-06-13 03:53:10.15	2026-06-13 03:55:10.636	120	1
1256	OFFLINE	2026-06-14 07:29:29.23	2026-06-14 07:29:30.738	1	5
1291	ACTIVE	2026-06-14 13:02:02.138	2026-06-14 13:07:07.132	304	3
1303	ACTIVE	2026-06-14 15:00:47.158	2026-06-14 15:21:17.109	1229	3
1335	AWAY	2026-06-14 18:31:25.192	2026-06-14 18:31:55.173	29	4
1337	ACTIVE	2026-06-14 18:40:53.363	\N	0	1
1359	ACTIVE	2026-06-14 20:45:24.225	2026-06-14 20:45:29.308	5	1
1388	AWAY	2026-06-14 23:08:01.403	2026-06-14 23:08:35.652	34	1
1418	ACTIVE	2026-06-15 01:20:14.354	2026-06-15 01:20:19.417	5	1
1420	ACTIVE	2026-06-15 01:21:25.937	2026-06-15 01:21:35.262	9	1
1440	AWAY	2026-06-15 03:48:37.893	2026-06-15 05:18:09.333	5371	1
1460	ACTIVE	2026-06-15 09:54:40.798	2026-06-15 09:55:26.406	45	5
1463	ACTIVE	2026-06-15 09:55:34.783	\N	0	5
1487	AWAY	2026-06-15 11:37:21.329	2026-06-15 12:11:11.407	2030	4
1495	AWAY	2026-06-15 13:24:06.329	2026-06-15 13:45:36.474	1290	4
1497	AWAY	2026-06-15 13:58:56.339	2026-06-15 14:11:21.381	745	4
1530	AWAY	2026-06-15 15:24:46.336	2026-06-15 15:27:11.368	145	4
1550	OFFLINE	2026-06-15 16:07:41.1	2026-06-15 16:07:41.734	0	5
1552	ACTIVE	2026-06-15 16:07:41.801	2026-06-15 16:07:46.632	4	5
1583	AWAY	2026-06-15 18:29:44.556	2026-06-15 18:33:12.891	208	1
1608	ACTIVE	2026-06-15 19:58:18.518	2026-06-15 20:04:58.487	399	4
1630	ACTIVE	2026-06-15 20:57:40.14	2026-06-15 22:56:43.294	7143	4
1646	ACTIVE	2026-06-15 23:26:41.512	2026-06-15 23:26:49.6	8	5
1647	AWAY	2026-06-15 23:26:49.6	2026-06-15 23:27:46.466	56	5
1642	ACTIVE	2026-06-15 22:56:43.294	2026-06-15 23:51:22.155	3278	4
1690	AWAY	2026-06-16 00:46:13.887	2026-06-16 01:39:12.806	3178	4
1731	ACTIVE	2026-06-16 10:43:43.659	2026-06-16 11:01:53.506	1089	3
1732	AWAY	2026-06-16 11:01:53.506	2026-06-16 11:03:03.487	69	3
1749	AWAY	2026-06-16 12:32:30.86	2026-06-16 12:34:22.055	111	3
1750	ACTIVE	2026-06-16 12:34:22.045	\N	0	3
1775	OFFLINE	2026-06-16 19:36:19.39	2026-06-16 19:36:21.49	2	1
1796	ACTIVE	2026-06-16 21:01:13.956	2026-06-16 21:51:18.677	3004	1
1817	AWAY	2026-06-16 23:07:05.015	2026-06-16 23:08:44.985	99	4
1839	AWAY	2026-06-17 00:00:43.26	2026-06-17 00:00:59.624	16	5
1841	AWAY	2026-06-17 00:02:09.985	2026-06-17 00:03:18.289	68	4
1860	AWAY	2026-06-17 01:19:18.439	2026-06-17 01:19:33.805	15	5
1820	AWAY	2026-06-16 23:24:31.226	2026-06-17 02:39:18.294	11687	1
1874	ACTIVE	2026-06-17 02:45:41.265	\N	0	1
1878	ACTIVE	2026-06-17 02:46:00.181	2026-06-17 02:46:05.262	5	1
1887	ACTIVE	2026-06-17 02:47:45.504	2026-06-17 02:47:48.254	2	1
1888	AWAY	2026-06-17 02:47:48.254	2026-06-17 02:47:53.656	5	1
1893	ACTIVE	2026-06-17 02:48:19.722	2026-06-17 02:48:24.624	4	1
1894	AWAY	2026-06-17 02:48:24.624	2026-06-17 02:48:37.384	12	1
1942	ACTIVE	2026-06-17 03:03:18.891	2026-06-17 03:03:46.238	27	1
1760	ACTIVE	2026-06-16 17:33:05.038	2026-06-17 03:47:40.422	36875	3
1948	ACTIVE	2026-06-17 03:52:06.153	2026-06-17 03:52:11.258	5	1
1967	ACTIVE	2026-06-17 03:59:13.059	2026-06-17 03:59:16.542	3	1
1986	AWAY	2026-06-17 04:10:53.282	2026-06-17 04:10:57.96	4	1
1987	ACTIVE	2026-06-17 04:10:57.96	2026-06-17 04:11:01.188	3	1
1988	AWAY	2026-06-17 04:11:01.188	2026-06-17 04:11:40.273	39	1
963	ACTIVE	2026-06-13 03:53:02.801	2026-06-13 03:53:07.373	4	1
967	ACTIVE	2026-06-13 03:55:12.923	2026-06-13 03:55:18.257	5	1
968	AWAY	2026-06-13 03:55:18.257	2026-06-13 03:55:20.725	2	1
969	ACTIVE	2026-06-13 03:55:20.725	2026-06-13 03:58:57.01	216	1
1257	ACTIVE	2026-06-14 07:29:30.738	2026-06-14 07:29:33.067	2	5
972	ACTIVE	2026-06-13 03:59:13.609	\N	0	1
1273	AWAY	2026-06-14 10:36:22.13	2026-06-14 10:36:52.113	29	3
973	ACTIVE	2026-06-13 03:59:13.591	\N	0	1
971	AWAY	2026-06-13 03:58:57.01	2026-06-13 03:59:13.71	16	1
975	ACTIVE	2026-06-13 03:59:13.71	2026-06-13 04:03:29.669	255	1
976	AWAY	2026-06-13 04:03:29.669	2026-06-13 04:03:30.407	0	1
977	ACTIVE	2026-06-13 04:03:30.407	\N	0	1
974	ACTIVE	2026-06-13 03:59:13.624	2026-06-13 04:03:30.518	256	1
984	ACTIVE	2026-06-13 04:30:30.166	2026-06-13 04:33:26.834	176	1
985	AWAY	2026-06-13 04:33:26.834	2026-06-13 04:33:31.075	4	1
1293	ACTIVE	2026-06-14 13:12:47.189	2026-06-14 13:27:52.117	904	3
1294	AWAY	2026-06-14 13:27:52.117	2026-06-14 13:30:32.122	160	3
1295	ACTIVE	2026-06-14 13:30:32.122	2026-06-14 13:40:32.113	599	3
1296	AWAY	2026-06-14 13:40:32.113	2026-06-14 13:51:41.251	669	3
1301	ACTIVE	2026-06-14 14:37:22.174	2026-06-14 14:53:32.105	969	3
1307	AWAY	2026-06-14 15:21:17.109	2026-06-14 15:22:12.11	55	3
1318	ACTIVE	2026-06-14 16:52:17.191	2026-06-14 16:57:17.103	299	3
1322	ACTIVE	2026-06-14 17:04:55.311	2026-06-14 17:11:59.018	423	3
1338	ACTIVE	2026-06-14 18:40:53.461	\N	0	1
1336	ACTIVE	2026-06-14 18:31:55.173	2026-06-14 18:51:30.185	1175	4
1342	AWAY	2026-06-14 18:51:30.185	2026-06-14 18:55:00.198	210	4
1360	AWAY	2026-06-14 20:45:29.308	2026-06-14 20:45:57.501	28	1
1389	OFFLINE	2026-06-14 23:08:35.652	2026-06-14 23:20:01.114	685	1
1392	OFFLINE	2026-06-14 23:20:04.356	2026-06-15 00:08:38.983	2914	1
1401	ACTIVE	2026-06-15 00:09:15.052	2026-06-15 00:10:42.023	86	1
1406	ACTIVE	2026-06-15 00:12:58.257	2026-06-15 00:13:03.455	5	4
1419	AWAY	2026-06-15 01:20:19.417	2026-06-15 01:21:25.937	66	1
1441	OFFLINE	2026-06-15 04:20:20.726	2026-06-15 04:21:11.365	50	4
1609	AWAY	2026-06-15 20:04:58.487	2026-06-15 20:14:23.561	565	4
1461	OFFLINE	2026-06-15 09:55:26.406	2026-06-15 09:55:34.789	8	5
1496	ACTIVE	2026-06-15 13:45:36.474	2026-06-15 13:58:56.339	799	4
1512	ACTIVE	2026-06-15 14:44:53.58	\N	0	5
1531	ACTIVE	2026-06-15 15:27:11.368	2026-06-15 15:33:01.331	349	4
1541	ACTIVE	2026-06-15 15:45:48.151	2026-06-15 15:46:10.874	22	3
1585	ACTIVE	2026-06-15 18:33:07.66	2026-06-15 18:33:08.645	0	4
1587	ACTIVE	2026-06-15 18:33:12.886	\N	0	1
1586	AWAY	2026-06-15 18:33:08.645	2026-06-15 18:33:37.28	28	4
1643	ACTIVE	2026-06-15 23:09:35.619	2026-06-15 23:09:53.61	17	1
1691	ACTIVE	2026-06-16 01:13:57.916	2026-06-16 01:13:58.069	0	1
1692	AWAY	2026-06-16 01:13:58.063	\N	0	1
1708	ACTIVE	2026-06-16 02:13:26.576	2026-06-16 02:13:30.444	3	1
1733	ACTIVE	2026-06-16 11:03:03.487	2026-06-16 11:09:33.493	390	3
1754	OFFLINE	2026-06-16 16:15:37.21	\N	0	1
1777	AWAY	2026-06-16 19:44:29.982	2026-06-16 19:46:14.984	105	4
1711	OFFLINE	2026-06-16 02:14:45.681	2026-06-16 20:08:22.335	64416	5
1797	AWAY	2026-06-16 21:24:59.967	2026-06-16 21:26:49.977	110	4
1818	ACTIVE	2026-06-16 23:08:44.985	2026-06-16 23:34:19.986	1535	4
1843	AWAY	2026-06-17 00:17:24.975	2026-06-17 00:22:35.197	310	4
1880	ACTIVE	2026-06-17 02:46:12.203	2026-06-17 02:46:18.506	6	1
1882	AWAY	2026-06-17 02:46:18.506	2026-06-17 02:47:00.113	41	1
1885	AWAY	2026-06-17 02:47:38.794	2026-06-17 02:47:45.504	6	1
1923	ACTIVE	2026-06-17 02:50:34.107	\N	0	1
1925	ACTIVE	2026-06-17 02:51:23.289	\N	0	1
1949	AWAY	2026-06-17 03:52:11.258	2026-06-17 03:52:22.99	11	1
1951	AWAY	2026-06-17 03:53:09.234	2026-06-17 03:54:00.626	51	1
1959	AWAY	2026-06-17 03:57:08.511	2026-06-17 03:57:19.963	11	1
1960	ACTIVE	2026-06-17 03:57:19.933	\N	0	1
1963	ACTIVE	2026-06-17 03:57:44.713	\N	0	1
1965	AWAY	2026-06-17 03:57:50.958	2026-06-17 03:59:13.059	82	1
1974	AWAY	2026-06-17 04:02:10.979	2026-06-17 04:05:53.433	222	1
1975	ACTIVE	2026-06-17 04:05:53.393	\N	0	1
1989	OFFLINE	2026-06-17 04:11:40.273	2026-06-17 04:11:42.316	2	1
978	ACTIVE	2026-06-13 04:03:30.518	2026-06-13 04:03:35.561	5	1
979	AWAY	2026-06-13 04:03:35.561	2026-06-13 04:06:56.202	200	1
1034	ACTIVE	2026-06-13 10:05:50.327	2026-06-13 10:08:15.311	144	3
980	ACTIVE	2026-06-13 04:06:56.202	2026-06-13 04:17:53.083	656	1
981	AWAY	2026-06-13 04:17:53.072	\N	0	1
982	AWAY	2026-06-13 04:17:53.083	2026-06-13 04:30:30.166	757	1
983	ACTIVE	2026-06-13 04:30:30.098	\N	0	1
986	OFFLINE	2026-06-13 04:33:31.075	2026-06-13 04:33:31.618	0	1
987	ACTIVE	2026-06-13 04:33:31.618	2026-06-13 04:33:37.077	5	1
988	AWAY	2026-06-13 04:33:37.077	2026-06-13 04:33:41.107	4	1
989	ACTIVE	2026-06-13 04:33:41.107	2026-06-13 04:33:44.727	3	1
990	AWAY	2026-06-13 04:33:44.727	2026-06-13 05:05:44.908	1920	1
991	ACTIVE	2026-06-13 05:05:44.908	2026-06-13 05:05:58.993	14	1
992	AWAY	2026-06-13 05:05:58.993	2026-06-13 05:05:59.045	0	1
1039	AWAY	2026-06-13 10:08:15.311	2026-06-13 10:08:17.558	2	3
993	OFFLINE	2026-06-13 05:05:59.045	2026-06-13 05:16:33.886	634	1
994	ACTIVE	2026-06-13 05:16:33.859	\N	0	1
995	ACTIVE	2026-06-13 05:16:33.886	2026-06-13 05:16:38.607	4	1
934	OFFLINE	2026-06-13 03:22:27.59	2026-06-13 05:25:24.526	7376	5
997	ACTIVE	2026-06-13 05:25:24.526	2026-06-13 05:25:30.139	5	5
998	AWAY	2026-06-13 05:25:30.139	2026-06-13 05:25:34.066	3	5
999	ACTIVE	2026-06-13 05:25:34.066	2026-06-13 05:25:45.856	11	5
1000	AWAY	2026-06-13 05:25:45.856	2026-06-13 05:25:50.651	4	5
1001	OFFLINE	2026-06-13 05:25:50.651	2026-06-13 05:26:00.691	10	5
1002	ACTIVE	2026-06-13 05:26:00.691	2026-06-13 05:26:12.54	11	5
1003	AWAY	2026-06-13 05:26:12.54	2026-06-13 05:26:17.355	4	5
1095	ACTIVE	2026-06-13 20:23:24.407	2026-06-14 04:32:26.263	29341	4
996	AWAY	2026-06-13 05:16:38.607	2026-06-13 08:00:31.457	9832	1
1005	ACTIVE	2026-06-13 08:00:31.457	2026-06-13 08:00:31.492	0	1
1006	ACTIVE	2026-06-13 08:00:31.492	2026-06-13 08:00:36.166	4	1
1007	AWAY	2026-06-13 08:00:36.166	2026-06-13 08:00:44.399	8	1
1008	ACTIVE	2026-06-13 08:00:44.399	2026-06-13 08:07:51.317	426	1
1010	ACTIVE	2026-06-13 09:35:33.738	2026-06-13 09:35:50.288	16	3
1011	AWAY	2026-06-13 09:35:50.288	2026-06-13 09:36:12.655	22	3
1009	AWAY	2026-06-13 08:07:51.317	2026-06-13 09:44:47.724	5816	1
1013	ACTIVE	2026-06-13 09:44:47.724	2026-06-13 09:44:52.856	5	1
1014	AWAY	2026-06-13 09:44:52.856	2026-06-13 09:45:25.226	32	1
1015	ACTIVE	2026-06-13 09:45:25.206	\N	0	1
1016	ACTIVE	2026-06-13 09:45:25.226	2026-06-13 09:45:35.888	10	1
1038	AWAY	2026-06-13 10:06:59.45	2026-06-13 10:09:33.069	153	1
1017	AWAY	2026-06-13 09:45:35.888	2026-06-13 09:45:45.135	9	1
1018	ACTIVE	2026-06-13 09:45:45.122	\N	0	1
1019	ACTIVE	2026-06-13 09:45:45.135	2026-06-13 09:46:09.741	24	1
1012	ACTIVE	2026-06-13 09:36:12.655	2026-06-13 09:47:08.838	656	3
1021	AWAY	2026-06-13 09:47:08.838	2026-06-13 09:48:49.035	100	3
1022	ACTIVE	2026-06-13 09:48:49.035	2026-06-13 09:49:33.995	44	3
1023	AWAY	2026-06-13 09:49:33.995	2026-06-13 09:51:01.747	87	3
1024	ACTIVE	2026-06-13 09:51:01.747	2026-06-13 09:51:46.72	44	3
1025	AWAY	2026-06-13 09:51:46.72	2026-06-13 09:53:24.497	97	3
1026	ACTIVE	2026-06-13 09:53:24.497	2026-06-13 09:54:09.459	44	3
1027	AWAY	2026-06-13 09:54:09.459	2026-06-13 09:56:34.409	144	3
1028	ACTIVE	2026-06-13 09:56:34.409	2026-06-13 09:57:19.383	44	3
1029	AWAY	2026-06-13 09:57:19.383	2026-06-13 09:59:12.102	112	3
1030	ACTIVE	2026-06-13 09:59:12.102	2026-06-13 10:02:27.079	194	3
1031	AWAY	2026-06-13 10:02:27.079	2026-06-13 10:03:12.116	45	3
1032	ACTIVE	2026-06-13 10:03:12.116	2026-06-13 10:05:12.092	119	3
1033	AWAY	2026-06-13 10:05:12.092	2026-06-13 10:05:50.327	38	3
1020	AWAY	2026-06-13 09:46:09.741	2026-06-13 10:06:48.093	1238	1
1035	ACTIVE	2026-06-13 10:06:48.093	2026-06-13 10:06:53.089	4	1
1036	AWAY	2026-06-13 10:06:53.089	2026-06-13 10:06:56.224	3	1
1037	ACTIVE	2026-06-13 10:06:56.224	2026-06-13 10:06:59.45	3	1
1041	ACTIVE	2026-06-13 10:09:33.069	2026-06-13 10:09:33.977	0	1
1042	AWAY	2026-06-13 10:09:33.977	2026-06-13 10:09:40.917	6	1
1043	ACTIVE	2026-06-13 10:09:40.917	2026-06-13 10:09:43.325	2	1
1044	AWAY	2026-06-13 10:09:43.325	2026-06-13 10:46:23.775	2200	1
1045	ACTIVE	2026-06-13 10:46:23.775	2026-06-13 10:46:38.286	14	1
1046	AWAY	2026-06-13 10:46:38.286	2026-06-13 10:46:47.928	9	1
1047	ACTIVE	2026-06-13 10:46:47.928	2026-06-13 10:49:06.749	138	1
1048	AWAY	2026-06-13 10:49:06.749	2026-06-13 10:49:31.824	25	1
1049	ACTIVE	2026-06-13 10:49:31.824	2026-06-13 10:49:51.339	19	1
1040	ACTIVE	2026-06-13 10:08:17.558	2026-06-13 11:09:06.129	3648	3
1050	AWAY	2026-06-13 10:49:51.339	2026-06-13 10:49:53.637	2	1
1052	ACTIVE	2026-06-13 10:49:53.637	\N	0	1
1051	ACTIVE	2026-06-13 10:49:53.638	2026-06-13 10:50:01.913	8	1
1053	AWAY	2026-06-13 10:50:01.913	2026-06-13 10:50:08.886	6	1
1054	ACTIVE	2026-06-13 10:50:08.886	2026-06-13 10:50:16.726	7	1
1055	AWAY	2026-06-13 10:50:16.726	2026-06-13 10:50:18.654	1	1
1056	ACTIVE	2026-06-13 10:50:18.652	\N	0	1
1057	ACTIVE	2026-06-13 10:50:18.654	2026-06-13 10:50:49.889	31	1
1058	AWAY	2026-06-13 10:50:49.889	2026-06-13 10:53:47.242	177	1
1059	ACTIVE	2026-06-13 10:53:47.242	2026-06-13 10:54:14.208	26	1
1074	AWAY	2026-06-13 16:36:51.181	2026-06-13 16:49:52.378	781	1
1060	AWAY	2026-06-13 10:54:14.208	2026-06-13 10:54:16.755	2	1
1062	ACTIVE	2026-06-13 10:54:16.755	2026-06-13 10:54:30.033	13	1
1064	AWAY	2026-06-13 11:09:06.129	2026-06-13 11:09:12.712	6	3
1065	ACTIVE	2026-06-13 11:09:12.707	\N	0	3
1063	AWAY	2026-06-13 10:54:30.033	2026-06-13 11:24:36.176	1806	1
1067	ACTIVE	2026-06-13 11:24:36.176	2026-06-13 13:18:57.76	6861	1
1068	OFFLINE	2026-06-13 13:18:57.76	2026-06-13 13:18:59.825	2	1
1069	ACTIVE	2026-06-13 13:18:59.825	2026-06-13 16:32:13.44	11593	1
1070	AWAY	2026-06-13 16:32:13.44	2026-06-13 16:34:25.463	132	1
1061	ACTIVE	2026-06-13 10:54:16.742	2026-06-13 16:34:25.488	20408	1
1072	ACTIVE	2026-06-13 16:34:25.488	\N	0	1
1071	ACTIVE	2026-06-13 16:34:25.463	2026-06-13 16:34:25.512	0	1
1073	ACTIVE	2026-06-13 16:34:25.512	2026-06-13 16:36:51.181	145	1
1079	OFFLINE	2026-06-13 17:55:46.327	2026-06-13 17:55:48.167	1	1
1075	OFFLINE	2026-06-13 16:49:52.378	2026-06-13 16:49:54.008	1	1
1077	ACTIVE	2026-06-13 16:49:54.008	2026-06-13 16:49:58.44	4	1
1078	AWAY	2026-06-13 16:49:58.44	2026-06-13 17:55:46.327	3947	1
1066	ACTIVE	2026-06-13 11:09:12.712	2026-06-13 18:00:49.306	24696	3
1082	ACTIVE	2026-06-13 18:00:55.558	2026-06-13 18:01:04.874	9	4
1083	AWAY	2026-06-13 18:01:04.874	2026-06-13 18:33:35.047	1950	4
1080	ACTIVE	2026-06-13 17:55:48.167	2026-06-13 19:11:39.374	4551	1
1076	ACTIVE	2026-06-13 16:49:53.929	2026-06-13 19:11:39.407	8505	1
1086	OFFLINE	2026-06-13 19:11:39.407	2026-06-13 19:11:42.745	3	1
1087	ACTIVE	2026-06-13 19:11:42.745	2026-06-13 19:11:42.783	0	1
1088	ACTIVE	2026-06-13 19:11:42.783	2026-06-13 19:11:47.01	4	1
1089	AWAY	2026-06-13 19:11:47.01	2026-06-13 19:11:48.063	1	1
1090	ACTIVE	2026-06-13 19:11:48.063	2026-06-13 20:01:11.323	2963	1
1084	ACTIVE	2026-06-13 18:33:35.047	2026-06-13 20:17:27.766	6232	4
1092	AWAY	2026-06-13 20:17:27.766	2026-06-13 20:17:33.005	5	4
1258	AWAY	2026-06-14 07:29:33.067	2026-06-14 07:30:47.511	74	5
1081	OFFLINE	2026-06-13 18:00:49.306	2026-06-14 09:59:37.201	57527	3
1085	AWAY	2026-06-13 19:11:39.374	2026-06-13 20:46:13.702	5674	1
1093	ACTIVE	2026-06-13 20:17:33.005	2026-06-13 20:23:11.479	338	4
1094	AWAY	2026-06-13 20:23:11.479	2026-06-13 20:23:24.397	12	4
1259	OFFLINE	2026-06-14 07:30:47.511	2026-06-14 07:34:57.345	249	5
1274	ACTIVE	2026-06-14 10:36:52.113	2026-06-14 10:46:37.13	585	3
1275	AWAY	2026-06-14 10:46:37.13	2026-06-14 11:11:45.665	1508	3
1297	ACTIVE	2026-06-14 13:51:41.251	2026-06-14 13:58:37.103	415	3
1339	ACTIVE	2026-06-14 18:40:53.52	2026-06-14 18:40:58.641	5	1
1340	AWAY	2026-06-14 18:40:58.641	2026-06-14 18:41:17.651	19	1
1361	ACTIVE	2026-06-14 20:45:57.501	2026-06-14 20:46:56.264	58	1
1362	AWAY	2026-06-14 20:46:56.264	2026-06-14 20:47:24.378	28	1
1367	AWAY	2026-06-14 20:58:44.048	2026-06-14 20:59:15.283	31	1
1390	ACTIVE	2026-06-14 23:20:01.114	2026-06-14 23:20:01.225	0	1
1422	ACTIVE	2026-06-15 01:21:48.496	2026-06-15 01:23:28.201	99	1
1462	ACTIVE	2026-06-15 09:55:34.737	\N	0	5
1443	AWAY	2026-06-15 04:21:16.513	2026-06-15 09:59:49.474	20312	4
1471	ACTIVE	2026-06-15 10:11:07.965	2026-06-15 10:11:22.018	14	5
1482	ACTIVE	2026-06-15 10:55:06.399	2026-06-15 11:05:06.335	599	4
1491	ACTIVE	2026-06-15 12:34:46.676	2026-06-15 12:34:51.546	4	1
1498	ACTIVE	2026-06-15 14:11:21.381	2026-06-15 14:19:51.327	509	4
1513	ACTIVE	2026-06-15 14:44:53.59	2026-06-15 14:45:01.827	8	5
1610	ACTIVE	2026-06-15 20:14:23.561	2026-06-15 20:24:42.564	619	4
1520	AWAY	2026-06-15 14:52:18.99	\N	0	5
1611	AWAY	2026-06-15 20:24:42.564	2026-06-15 20:25:25.91	43	4
1516	OFFLINE	2026-06-15 14:45:20.504	2026-06-15 14:52:18.991	418	5
1535	ACTIVE	2026-06-15 15:37:09.423	\N	0	1
1532	AWAY	2026-06-15 15:33:01.331	2026-06-15 15:43:56.479	655	4
1543	ACTIVE	2026-06-15 15:46:15.583	2026-06-15 15:49:52.111	216	1
1551	ACTIVE	2026-06-15 16:07:41.734	\N	0	5
1549	AWAY	2026-06-15 16:07:41.081	2026-06-15 16:07:41.801	0	5
1590	ACTIVE	2026-06-15 18:33:37.241	\N	0	4
1644	AWAY	2026-06-15 23:09:53.61	2026-06-15 23:09:57.466	3	1
1645	OFFLINE	2026-06-15 23:09:57.466	2026-06-16 01:13:57.916	7440	1
1698	ACTIVE	2026-06-16 01:52:37.736	2026-06-16 02:01:47.061	549	4
1709	AWAY	2026-06-16 02:13:30.444	2026-06-16 02:13:57.945	27	1
1707	ACTIVE	2026-06-16 02:10:03.099	2026-06-16 02:14:45.681	282	5
1734	AWAY	2026-06-16 11:09:33.493	2026-06-16 11:15:08.633	335	3
1755	OFFLINE	2026-06-16 16:15:37.231	2026-06-16 16:15:38.757	1	1
1778	ACTIVE	2026-06-16 19:46:14.984	2026-06-16 19:52:05.008	350	4
1798	ACTIVE	2026-06-16 21:26:49.977	2026-06-16 21:43:49.982	1020	4
1819	ACTIVE	2026-06-16 23:21:44.415	2026-06-16 23:24:31.226	166	1
1846	AWAY	2026-06-17 00:32:40.742	2026-06-17 00:32:49.956	9	5
1883	ACTIVE	2026-06-17 02:47:00.089	\N	0	1
1886	ACTIVE	2026-06-17 02:47:45.482	\N	0	1
1890	ACTIVE	2026-06-17 02:47:53.656	2026-06-17 02:48:07.388	13	1
1896	ACTIVE	2026-06-17 02:48:37.384	2026-06-17 02:48:45.176	7	1
1931	ACTIVE	2026-06-17 03:00:13.065	\N	0	1
1933	ACTIVE	2026-06-17 03:00:29.68	\N	0	1
1950	ACTIVE	2026-06-17 03:52:22.99	2026-06-17 03:53:09.234	46	1
1964	ACTIVE	2026-06-17 03:57:44.72	2026-06-17 03:57:50.958	6	1
1976	ACTIVE	2026-06-17 04:05:53.433	2026-06-17 04:06:00.272	6	1
1979	ACTIVE	2026-06-17 04:09:28.446	2026-06-17 04:09:38.544	10	1
1990	ACTIVE	2026-06-17 04:11:42.316	2026-06-17 04:11:47.471	5	1
1096	ACTIVE	2026-06-13 20:23:24.397	\N	0	4
1004	OFFLINE	2026-06-13 05:26:17.355	2026-06-13 20:27:09.04	54051	5
1097	ACTIVE	2026-06-13 20:27:09.04	2026-06-13 20:27:13.976	4	5
1098	AWAY	2026-06-13 20:27:13.976	2026-06-13 20:27:45.036	31	5
1099	OFFLINE	2026-06-13 20:27:45.036	2026-06-13 20:27:47.199	2	5
1104	AWAY	2026-06-13 20:27:57.953	2026-06-13 20:28:14.216	16	5
1105	OFFLINE	2026-06-13 20:28:14.216	2026-06-13 22:07:26.032	5951	5
1260	ACTIVE	2026-06-14 07:34:57.345	2026-06-14 07:34:59.226	1	5
1261	AWAY	2026-06-14 07:34:59.226	2026-06-14 07:35:06.476	7	5
1265	OFFLINE	2026-06-14 07:37:44.178	2026-06-14 07:37:44.502	0	5
1267	OFFLINE	2026-06-14 07:37:44.552	2026-06-14 07:37:46.031	1	5
1298	AWAY	2026-06-14 13:58:37.103	2026-06-14 14:02:12.141	215	3
1299	ACTIVE	2026-06-14 14:02:12.141	2026-06-14 14:28:57.114	1604	3
1302	AWAY	2026-06-14 14:53:32.105	2026-06-14 15:00:47.158	435	3
1612	ACTIVE	2026-06-15 20:25:25.905	\N	0	4
1341	OFFLINE	2026-06-14 18:41:17.651	2026-06-14 20:45:24.225	7446	1
1648	OFFLINE	2026-06-15 23:27:46.466	2026-06-15 23:44:06.513	980	5
1363	OFFLINE	2026-06-14 20:47:24.378	2026-06-14 20:57:43.472	619	1
1347	OFFLINE	2026-06-14 19:12:52.367	2026-06-14 21:49:44.676	9412	5
1391	AWAY	2026-06-14 23:20:01.225	2026-06-14 23:20:04.356	3	1
1423	AWAY	2026-06-15 01:23:28.201	2026-06-15 01:58:19.865	2091	1
1444	OFFLINE	2026-06-15 05:18:09.333	2026-06-15 05:18:52.767	43	1
1464	ACTIVE	2026-06-15 09:55:34.789	2026-06-15 09:55:42.679	7	5
1465	OFFLINE	2026-06-15 09:55:42.679	2026-06-15 10:10:08.583	865	5
1467	ACTIVE	2026-06-15 10:10:08.583	2026-06-15 10:10:08.728	0	5
1489	AWAY	2026-06-15 12:17:26.37	2026-06-15 12:19:29.096	122	4
1499	AWAY	2026-06-15 14:19:51.327	2026-06-15 14:23:51.33	240	4
1500	ACTIVE	2026-06-15 14:23:51.33	2026-06-15 14:37:21.334	810	4
1651	OFFLINE	2026-06-15 23:44:08.868	2026-06-15 23:44:27.565	18	5
1662	OFFLINE	2026-06-15 23:50:47.505	2026-06-15 23:50:49.07	1	5
1502	OFFLINE	2026-06-15 14:25:28.668	2026-06-15 14:44:10.017	1121	5
1521	AWAY	2026-06-15 14:52:19.002	\N	0	5
1538	ACTIVE	2026-06-15 15:43:30.284	2026-06-15 15:45:40.171	129	1
1665	ACTIVE	2026-06-15 23:50:55.286	2026-06-15 23:50:56.988	1	5
1666	AWAY	2026-06-15 23:50:56.988	2026-06-15 23:52:12.508	75	5
1682	AWAY	2026-06-15 23:58:43.892	2026-06-16 00:00:04.006	80	4
1704	AWAY	2026-06-16 02:09:42.752	2026-06-16 02:09:45.05	2	4
1705	OFFLINE	2026-06-16 02:09:45.05	2026-06-16 02:10:01.744	16	4
1718	ACTIVE	2026-06-16 04:21:11.587	2026-06-16 04:23:07.092	115	1
1721	ACTIVE	2026-06-16 04:31:40.134	2026-06-16 05:18:50.113	2829	1
1736	AWAY	2026-06-16 11:20:38.534	2026-06-16 11:22:03.499	84	3
1738	AWAY	2026-06-16 11:30:03.489	2026-06-16 11:30:38.507	35	3
1756	ACTIVE	2026-06-16 16:15:38.757	2026-06-16 16:21:17.227	338	1
1779	AWAY	2026-06-16 19:52:05.008	2026-06-16 19:53:44.231	99	4
1799	AWAY	2026-06-16 21:43:49.982	2026-06-16 21:50:40.088	410	4
1821	AWAY	2026-06-16 23:34:19.986	2026-06-16 23:34:39.988	20	4
1851	AWAY	2026-06-17 00:34:00.17	2026-06-17 00:34:04.874	4	5
1892	ACTIVE	2026-06-17 02:48:19.718	\N	0	1
1902	ACTIVE	2026-06-17 02:49:02.174	2026-06-17 02:49:25.584	23	1
1904	ACTIVE	2026-06-17 02:49:28.904	\N	0	1
1906	AWAY	2026-06-17 02:49:30.597	2026-06-17 02:49:45.382	14	1
1912	AWAY	2026-06-17 02:50:12.569	2026-06-17 02:50:18.299	5	1
1914	ACTIVE	2026-06-17 02:50:18.299	2026-06-17 02:50:19.907	1	1
1917	ACTIVE	2026-06-17 02:50:22.042	2026-06-17 02:50:23.191	1	1
1919	ACTIVE	2026-06-17 02:50:24.31	\N	0	1
1922	ACTIVE	2026-06-17 02:50:34.11	2026-06-17 02:50:42.844	8	1
1952	ACTIVE	2026-06-17 03:54:00.594	\N	0	1
1954	AWAY	2026-06-17 03:54:06.573	2026-06-17 03:55:01.575	55	1
1966	ACTIVE	2026-06-17 03:59:13.05	\N	0	1
1993	AWAY	2026-06-17 04:14:08.263	2026-06-17 04:14:12.135	3	1
1994	OFFLINE	2026-06-17 04:14:12.135	\N	0	1
1101	AWAY	2026-06-13 20:27:51.671	\N	0	5
1100	ACTIVE	2026-06-13 20:27:47.199	2026-06-13 20:27:51.684	4	5
1102	OFFLINE	2026-06-13 20:27:51.684	2026-06-13 20:27:53.57	1	5
1103	ACTIVE	2026-06-13 20:27:53.57	2026-06-13 20:27:57.953	4	5
1091	AWAY	2026-06-13 20:01:11.323	2026-06-13 20:46:13.572	2702	1
1106	ACTIVE	2026-06-13 20:46:13.552	\N	0	1
1107	ACTIVE	2026-06-13 20:46:13.572	\N	0	1
1108	ACTIVE	2026-06-13 20:46:13.702	2026-06-13 20:46:38.139	24	1
1109	AWAY	2026-06-13 20:46:38.139	2026-06-13 20:47:56.753	78	1
1110	ACTIVE	2026-06-13 20:47:56.753	2026-06-13 20:51:51.905	235	1
1111	AWAY	2026-06-13 20:51:51.905	2026-06-13 20:52:44.016	52	1
1112	ACTIVE	2026-06-13 20:52:44.016	2026-06-13 20:53:23.367	39	1
1162	ACTIVE	2026-06-13 23:24:28.473	2026-06-13 23:24:34.835	6	1
1113	AWAY	2026-06-13 20:53:23.367	2026-06-13 20:53:47.167	23	1
1114	ACTIVE	2026-06-13 20:53:47.154	\N	0	1
1115	ACTIVE	2026-06-13 20:53:47.167	2026-06-13 20:53:59.874	12	1
1116	AWAY	2026-06-13 20:53:59.874	2026-06-13 20:54:04.639	4	1
1117	ACTIVE	2026-06-13 20:54:04.63	\N	0	1
1118	ACTIVE	2026-06-13 20:54:04.639	2026-06-13 20:54:38.567	33	1
1120	ACTIVE	2026-06-13 22:07:26.032	2026-06-13 22:07:32.837	6	5
1121	AWAY	2026-06-13 22:07:32.837	2026-06-13 22:08:37.172	64	5
1122	OFFLINE	2026-06-13 22:08:37.172	2026-06-13 22:09:33.819	56	5
1123	ACTIVE	2026-06-13 22:09:33.819	2026-06-13 22:09:57.385	23	5
1124	AWAY	2026-06-13 22:09:57.385	2026-06-13 22:10:00.419	3	5
1125	OFFLINE	2026-06-13 22:10:00.419	2026-06-13 22:12:29.374	148	5
1126	ACTIVE	2026-06-13 22:12:29.374	2026-06-13 22:12:34.239	4	5
1127	OFFLINE	2026-06-13 22:12:34.239	2026-06-13 22:13:42.345	68	5
1128	ACTIVE	2026-06-13 22:13:42.345	2026-06-13 22:13:43.789	1	5
1129	AWAY	2026-06-13 22:13:43.789	2026-06-13 22:14:00.07	16	5
1130	OFFLINE	2026-06-13 22:14:00.07	2026-06-13 22:14:02.179	2	5
1131	ACTIVE	2026-06-13 22:14:02.179	2026-06-13 22:14:09.027	6	5
1132	AWAY	2026-06-13 22:14:09.027	2026-06-13 22:14:27.797	18	5
1133	OFFLINE	2026-06-13 22:14:27.797	2026-06-13 22:15:11.208	43	5
1134	ACTIVE	2026-06-13 22:15:11.208	2026-06-13 22:15:11.342	0	5
1135	OFFLINE	2026-06-13 22:15:11.342	2026-06-13 22:18:21.499	190	5
1136	ACTIVE	2026-06-13 22:18:21.499	2026-06-13 22:18:21.891	0	5
1137	AWAY	2026-06-13 22:18:21.891	2026-06-13 22:18:25.683	3	5
1138	OFFLINE	2026-06-13 22:18:25.683	2026-06-13 22:18:36.083	10	5
1139	ACTIVE	2026-06-13 22:18:36.083	2026-06-13 22:18:45.053	8	5
1140	AWAY	2026-06-13 22:18:45.053	2026-06-13 22:18:49.923	4	5
1141	OFFLINE	2026-06-13 22:18:49.923	2026-06-13 22:19:29.55	39	5
1142	ACTIVE	2026-06-13 22:19:29.55	2026-06-13 22:19:31.127	1	5
1119	AWAY	2026-06-13 20:54:38.567	2026-06-13 23:00:18.49	7539	1
1144	ACTIVE	2026-06-13 23:00:18.49	2026-06-13 23:00:23.797	5	1
1145	AWAY	2026-06-13 23:00:23.797	2026-06-13 23:01:49.817	86	1
1146	ACTIVE	2026-06-13 23:01:49.817	2026-06-13 23:02:06.358	16	1
1182	AWAY	2026-06-14 01:29:00.67	2026-06-14 02:01:11.856	1931	1
1147	AWAY	2026-06-13 23:02:06.358	2026-06-13 23:02:09.036	2	1
1148	ACTIVE	2026-06-13 23:02:09.018	\N	0	1
1149	ACTIVE	2026-06-13 23:02:09.036	2026-06-13 23:02:20.795	11	1
1150	AWAY	2026-06-13 23:02:20.795	2026-06-13 23:03:21.751	60	1
1151	ACTIVE	2026-06-13 23:03:21.751	2026-06-13 23:03:55.136	33	1
1163	AWAY	2026-06-13 23:24:34.835	2026-06-13 23:24:40.422	5	1
1152	AWAY	2026-06-13 23:03:55.136	2026-06-13 23:04:02.665	7	1
1153	ACTIVE	2026-06-13 23:04:02.635	\N	0	1
1154	ACTIVE	2026-06-13 23:04:02.665	2026-06-13 23:04:15.215	12	1
1156	ACTIVE	2026-06-13 23:14:19.414	\N	0	1
1155	AWAY	2026-06-13 23:04:15.215	2026-06-13 23:14:19.433	604	1
1157	ACTIVE	2026-06-13 23:14:19.432	\N	0	1
1158	ACTIVE	2026-06-13 23:14:19.433	2026-06-13 23:14:19.529	0	1
1165	ACTIVE	2026-06-13 23:24:40.422	2026-06-13 23:24:42.961	2	1
1160	ACTIVE	2026-06-13 23:24:28.444	\N	0	1
1159	AWAY	2026-06-13 23:14:19.529	2026-06-13 23:24:28.473	608	1
1161	ACTIVE	2026-06-13 23:24:28.445	\N	0	1
1166	AWAY	2026-06-13 23:24:42.961	2026-06-13 23:45:20.541	1237	1
1167	ACTIVE	2026-06-13 23:45:20.541	\N	0	1
1186	ACTIVE	2026-06-14 01:51:05.325	2026-06-14 01:51:44.576	39	5
1164	ACTIVE	2026-06-13 23:24:40.412	2026-06-13 23:45:20.653	1240	1
1169	ACTIVE	2026-06-13 23:45:20.653	2026-06-13 23:45:28.841	8	1
1187	AWAY	2026-06-14 01:51:44.542	\N	0	5
1170	AWAY	2026-06-13 23:45:28.841	2026-06-14 00:10:19.834	1490	1
1172	ACTIVE	2026-06-14 00:10:19.834	\N	0	1
1168	ACTIVE	2026-06-13 23:45:20.646	2026-06-14 00:10:19.868	1499	1
1173	ACTIVE	2026-06-14 00:10:19.868	2026-06-14 00:10:30.079	10	1
1174	AWAY	2026-06-14 00:10:30.079	2026-06-14 01:09:21.629	3531	1
1175	ACTIVE	2026-06-14 01:09:21.615	\N	0	1
1171	ACTIVE	2026-06-14 00:10:19.837	2026-06-14 01:09:21.655	3541	1
1177	ACTIVE	2026-06-14 01:09:21.655	2026-06-14 01:09:22.979	1	1
1179	ACTIVE	2026-06-14 01:28:57.774	\N	0	1
1178	AWAY	2026-06-14 01:09:22.979	2026-06-14 01:28:57.789	1174	1
1176	ACTIVE	2026-06-14 01:09:21.629	2026-06-14 01:28:57.822	1176	1
1181	ACTIVE	2026-06-14 01:28:57.822	2026-06-14 01:29:00.67	2	1
1143	OFFLINE	2026-06-13 22:19:31.127	2026-06-14 01:50:46.204	12675	5
1188	OFFLINE	2026-06-14 01:51:44.576	2026-06-14 01:51:45.109	0	5
1183	ACTIVE	2026-06-14 01:50:46.204	2026-06-14 01:51:04.248	18	5
1184	OFFLINE	2026-06-14 01:51:04.241	\N	0	5
1185	OFFLINE	2026-06-14 01:51:04.248	2026-06-14 01:51:05.325	1	5
1190	ACTIVE	2026-06-14 01:51:45.109	2026-06-14 01:51:50.269	5	5
1191	AWAY	2026-06-14 01:51:50.269	2026-06-14 01:52:02.474	12	5
1192	OFFLINE	2026-06-14 01:52:02.474	2026-06-14 01:56:35.702	273	5
1193	ACTIVE	2026-06-14 01:56:35.702	\N	0	5
1180	ACTIVE	2026-06-14 01:28:57.789	2026-06-14 02:01:12.03	1934	1
1189	ACTIVE	2026-06-14 01:51:45.056	2026-06-14 01:56:35.855	290	5
1194	ACTIVE	2026-06-14 01:56:35.827	\N	0	5
1195	ACTIVE	2026-06-14 01:56:35.855	2026-06-14 01:57:11.243	35	5
1196	AWAY	2026-06-14 01:57:11.243	2026-06-14 01:57:16.103	4	5
1198	ACTIVE	2026-06-14 02:01:11.856	2026-06-14 02:01:12.148	0	1
1200	ACTIVE	2026-06-14 02:01:12.148	2026-06-14 02:01:31.974	19	1
1201	AWAY	2026-06-14 02:01:31.974	2026-06-14 02:45:07.61	2615	1
1202	ACTIVE	2026-06-14 02:45:07.61	2026-06-14 02:45:12.566	4	1
1203	AWAY	2026-06-14 02:45:12.566	2026-06-14 02:45:18.451	5	1
1204	ACTIVE	2026-06-14 02:45:18.451	2026-06-14 02:47:53.996	155	1
1205	AWAY	2026-06-14 02:47:53.996	2026-06-14 02:50:23.807	149	1
1206	ACTIVE	2026-06-14 02:50:23.807	\N	0	1
1208	ACTIVE	2026-06-14 02:50:24.112	2026-06-14 02:51:55.193	91	1
1199	ACTIVE	2026-06-14 02:01:12.03	2026-06-14 02:50:24.112	2952	1
1207	ACTIVE	2026-06-14 02:50:24.095	\N	0	1
1211	ACTIVE	2026-06-14 02:54:14.689	2026-06-14 02:54:19.824	5	5
1197	OFFLINE	2026-06-14 01:57:16.103	2026-06-14 02:54:14.689	3418	5
1212	AWAY	2026-06-14 02:54:19.824	2026-06-14 02:54:24.585	4	5
1213	OFFLINE	2026-06-14 02:54:24.585	2026-06-14 02:54:24.826	0	5
1214	ACTIVE	2026-06-14 02:54:24.826	\N	0	5
1210	ACTIVE	2026-06-14 02:54:14.556	2026-06-14 02:54:24.895	10	5
1215	ACTIVE	2026-06-14 02:54:24.895	2026-06-14 02:54:29.989	5	5
1216	AWAY	2026-06-14 02:54:29.989	2026-06-14 02:56:37.379	127	5
1231	OFFLINE	2026-06-14 03:09:49.762	2026-06-14 04:35:13.741	5123	5
1623	ACTIVE	2026-06-15 20:50:18.967	\N	0	4
1217	OFFLINE	2026-06-14 02:56:37.379	2026-06-14 03:06:08.996	571	5
1218	ACTIVE	2026-06-14 03:06:08.996	2026-06-14 03:06:15.322	6	5
1219	AWAY	2026-06-14 03:06:15.322	2026-06-14 03:06:20.85	5	5
1220	OFFLINE	2026-06-14 03:06:20.85	2026-06-14 03:07:34.352	73	5
1221	ACTIVE	2026-06-14 03:07:34.352	2026-06-14 03:07:48.636	14	5
1222	AWAY	2026-06-14 03:07:48.636	2026-06-14 03:07:54.076	5	5
1223	OFFLINE	2026-06-14 03:07:54.076	2026-06-14 03:08:52.932	58	5
1224	ACTIVE	2026-06-14 03:08:52.932	2026-06-14 03:08:55.588	2	5
1225	AWAY	2026-06-14 03:08:55.588	2026-06-14 03:09:00.403	4	5
1226	OFFLINE	2026-06-14 03:09:00.403	2026-06-14 03:09:05.794	5	5
1227	ACTIVE	2026-06-14 03:09:05.794	2026-06-14 03:09:09.858	4	5
1228	OFFLINE	2026-06-14 03:09:09.858	2026-06-14 03:09:37.777	27	5
1229	ACTIVE	2026-06-14 03:09:37.777	2026-06-14 03:09:43.11	5	5
1230	AWAY	2026-06-14 03:09:43.11	2026-06-14 03:09:49.762	6	5
1262	OFFLINE	2026-06-14 07:35:06.476	2026-06-14 07:35:38.157	31	5
1270	ACTIVE	2026-06-14 09:59:37.201	2026-06-14 10:19:52.099	1214	3
1300	AWAY	2026-06-14 14:28:57.114	2026-06-14 14:37:22.174	505	3
1343	ACTIVE	2026-06-14 18:55:00.198	2026-06-14 19:05:35.156	634	4
1364	ACTIVE	2026-06-14 20:57:43.412	\N	0	1
1394	ACTIVE	2026-06-14 23:22:50.151	2026-06-14 23:32:50.15	599	4
1424	ACTIVE	2026-06-15 01:58:19.865	2026-06-15 01:58:19.968	0	1
1445	ACTIVE	2026-06-15 05:18:52.767	2026-06-15 06:36:39.447	4666	1
1474	AWAY	2026-06-15 10:19:06.402	2026-06-15 10:19:08.754	2	5
1466	ACTIVE	2026-06-15 09:59:49.474	2026-06-15 10:36:11.342	2181	4
1493	AWAY	2026-06-15 12:49:06.341	2026-06-15 13:18:41.429	1775	4
1503	AWAY	2026-06-15 14:37:21.334	2026-06-15 14:43:51.599	390	4
1508	ACTIVE	2026-06-15 14:44:10.022	2026-06-15 14:44:23.302	13	5
1518	ACTIVE	2026-06-15 14:50:16.351	2026-06-15 15:04:02.45	826	4
1544	AWAY	2026-06-15 15:49:51.943	\N	0	1
1556	ACTIVE	2026-06-15 16:19:46.395	2026-06-15 16:25:21.331	334	4
1616	ACTIVE	2026-06-15 20:31:58.478	2026-06-15 20:44:48.527	770	4
1617	AWAY	2026-06-15 20:44:48.527	2026-06-15 20:45:03.482	14	4
1614	OFFLINE	2026-06-15 20:26:18.603	2026-06-15 21:02:15.548	2156	1
1554	OFFLINE	2026-06-15 16:08:51.707	2026-06-15 23:26:41.512	26269	5
1649	ACTIVE	2026-06-15 23:44:06.513	2026-06-15 23:44:08.203	1	5
1542	OFFLINE	2026-06-15 15:46:10.874	2026-06-15 23:51:28.106	29117	3
1737	ACTIVE	2026-06-16 11:22:03.499	2026-06-16 11:30:03.489	479	3
1746	AWAY	2026-06-16 12:18:03.696	2026-06-16 12:32:25.493	861	3
1706	ACTIVE	2026-06-16 02:10:01.744	2026-06-16 17:58:24.978	56903	4
1761	AWAY	2026-06-16 17:58:24.978	2026-06-16 18:00:05.049	100	4
1757	AWAY	2026-06-16 16:21:17.227	2026-06-16 19:36:19.39	11702	1
1780	ACTIVE	2026-06-16 19:53:44.231	2026-06-16 20:09:05.008	920	4
1800	ACTIVE	2026-06-16 21:50:40.088	2026-06-16 22:01:39.988	659	4
1822	ACTIVE	2026-06-16 23:34:39.988	2026-06-16 23:48:09.983	809	4
1853	ACTIVE	2026-06-17 00:34:14.496	2026-06-17 00:34:15.217	0	5
1920	ACTIVE	2026-06-17 02:50:24.326	2026-06-17 02:50:25.043	0	1
1921	AWAY	2026-06-17 02:50:25.043	2026-06-17 02:50:34.107	9	1
1927	ACTIVE	2026-06-17 02:51:23.334	2026-06-17 02:52:09.762	46	1
1953	ACTIVE	2026-06-17 03:54:00.626	2026-06-17 03:54:06.573	5	1
1970	ACTIVE	2026-06-17 04:01:47.148	2026-06-17 04:02:03.899	16	1
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, name, "placeOfBirth", "dateOfBirth", gender, address, religion, "maritalStatus", "jobTitle", nationality, "joinedAt", email, phone, username, password, pin, rfid, "fingerprintData", "securityMode", status, "isVerified", "baseShift", "socketId", "lastSeen", "assignedTableIds", "currentActivePage", "createdAt", "updatedAt", "roleId") FROM stdin;
5	SUPER	\N	\N	\N	\N	\N	\N	\N	\N	\N	scuff@gmail.com		scuff	$2b$10$DyTwIiX1gtH/i2bclCHgneZ.R0qFERlP02/JFVKvgB9mSvbuhZtPG	000000	\N		HYBRID	OFFLINE	t		P18CpRtf-eZRLepYAABC	2026-06-17 01:19:33.805	[{"type":"BILLIARD","id":1},{"type":"BILLIARD","id":2},{"type":"BILLIARD","id":3},{"type":"BILLIARD","id":4},{"type":"BILLIARD","id":5},{"type":"BILLIARD","id":6},{"type":"BILLIARD","id":7},{"type":"BILLIARD","id":8},{"type":"BILLIARD","id":9},{"type":"BILLIARD","id":10},{"type":"BILLIARD","id":11},{"type":"BILLIARD","id":12},{"type":"CAFE","id":1},{"type":"CAFE","id":2},{"type":"CAFE","id":3},{"type":"CAFE","id":4},{"type":"CAFE","id":5},{"type":"CAFE","id":6},{"type":"CAFE","id":7},{"type":"CAFE","id":8},{"type":"CAFE","id":9},{"type":"CAFE","id":10},{"type":"CAFE","id":11},{"type":"CAFE","id":12}]	/	2026-06-12 03:34:35.056667	2026-06-17 01:19:33.935292	4
2	TIWI	\N	\N	\N	\N	\N	\N	\N	\N	\N	tiwi@gmail.com		tiwi	$2b$10$/mqL1NTeUWr2JS1Nw/v/QOS9LRL1.iu188BmryNSY.RZyproBllpa	\N	\N		HYBRID	OFFLINE	t	OVERTIME	\N	\N	\N	\N	2026-06-12 03:20:29.407189	2026-06-12 03:20:29.407189	2
3	Kasir 1	\N	\N	\N	\N	\N	\N	\N	\N	\N	kasir@gmail.com		kasir1	$2b$10$Ss8gA73Bza4ZLpknnDNoaOf/3Lk5kUl37GnRv3ZJSJcRZjvJgKHii	\N	\N		HYBRID	OFFLINE	t	SHIFT 1	ivBoAou4z81Q2WU5AAAO	2026-06-17 03:47:40.422	[{"type":"BILLIARD","id":1},{"type":"BILLIARD","id":2},{"type":"BILLIARD","id":3},{"type":"BILLIARD","id":4},{"type":"BILLIARD","id":5},{"type":"BILLIARD","id":6},{"type":"BILLIARD","id":7},{"type":"BILLIARD","id":8},{"type":"BILLIARD","id":9},{"type":"BILLIARD","id":10},{"type":"BILLIARD","id":11},{"type":"BILLIARD","id":12},{"type":"CAFE","id":1},{"type":"CAFE","id":2},{"type":"CAFE","id":3},{"type":"CAFE","id":4},{"type":"CAFE","id":5},{"type":"CAFE","id":6},{"type":"CAFE","id":7},{"type":"CAFE","id":8},{"type":"CAFE","id":9},{"type":"CAFE","id":10},{"type":"CAFE","id":11},{"type":"CAFE","id":12}]	/	2026-06-12 03:24:02.183948	2026-06-17 03:47:40.456425	3
1	Teknisi	\N	\N	\N	\N	\N	\N	\N	\N	\N	admin@voc-billiard.com		0	$2b$10$8u3/dVNhrUiSpONBY3muDuWdfvLSvPWjX0IEw4MRY3kONez34sg3.	\N	\N		HYBRID	OFFLINE	t		pQ9gclRS5kMYMksdAAAR	2026-06-17 04:14:12.135	\N	/admin/reports/business-day	2026-06-12 02:32:03.159757	2026-06-17 04:14:12.193401	1
4	Kasir 2	\N	\N	\N	\N	\N	\N	\N	\N	\N	kasir2@gmail.com		kasir2	$2b$10$Km.FNMY0BUrQjNwvbHoSa.Dqj/ViQEuHbhTKvAhArjOWIzrq155bO	\N	\N		HYBRID	OFFLINE	t	SHIFT 2	ivBoAou4z81Q2WU5AAAO	2026-06-17 01:41:43.583	[{"type":"BILLIARD","id":1},{"type":"BILLIARD","id":2},{"type":"BILLIARD","id":3},{"type":"BILLIARD","id":4},{"type":"BILLIARD","id":5},{"type":"BILLIARD","id":6},{"type":"BILLIARD","id":7},{"type":"BILLIARD","id":8},{"type":"BILLIARD","id":9},{"type":"BILLIARD","id":10},{"type":"BILLIARD","id":11},{"type":"BILLIARD","id":12},{"type":"CAFE","id":1},{"type":"CAFE","id":2},{"type":"CAFE","id":3},{"type":"CAFE","id":4},{"type":"CAFE","id":5},{"type":"CAFE","id":6},{"type":"CAFE","id":7},{"type":"CAFE","id":8},{"type":"CAFE","id":9},{"type":"CAFE","id":10},{"type":"CAFE","id":11},{"type":"CAFE","id":12}]	/	2026-06-12 03:27:05.220298	2026-06-17 01:41:43.584259	3
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
43	1	IDLE_TIMEOUT	Meninggalkan sistem selama 32 menit (termasuk waktu offline pada shift aktif).	0.00	\N	\N	2	\N	2026-06-13 05:05:44.907661
44	1	IDLE_TIMEOUT	Meninggalkan sistem selama 163 menit (termasuk waktu offline pada shift aktif).	0.00	\N	\N	2	\N	2026-06-13 08:00:31.354992
45	1	IDLE_TIMEOUT	Meninggalkan sistem selama 163 menit (termasuk waktu offline pada shift aktif).	0.00	\N	\N	2	\N	2026-06-13 08:00:31.41651
46	1	IDLE_TIMEOUT	Meninggalkan sistem selama 104 menit (termasuk waktu offline pada shift aktif).	0.00	\N	3	2	\N	2026-06-13 09:44:47.657106
47	3	IDLE_TIMEOUT	Meninggalkan sistem selama 12 menit (termasuk waktu offline pada shift aktif).	0.00	\N	3	2	\N	2026-06-13 09:48:48.978629
48	1	IDLE_TIMEOUT	Meninggalkan sistem selama 20 menit (termasuk waktu offline pada shift aktif).	0.00	\N	3	2	\N	2026-06-13 10:06:48.033309
49	1	IDLE_TIMEOUT	Meninggalkan sistem selama 36 menit (termasuk waktu offline pada shift aktif).	0.00	\N	3	2	\N	2026-06-13 10:46:23.730697
50	1	IDLE_TIMEOUT	Meninggalkan sistem selama 30 menit (termasuk waktu offline pada shift aktif).	0.00	\N	3	2	\N	2026-06-13 11:24:36.179668
51	1	IDLE_TIMEOUT	Meninggalkan sistem selama 49 menit (termasuk waktu offline pada shift aktif).	0.00	\N	4	2	\N	2026-06-13 20:01:05.496437
52	4	IDLE_TIMEOUT	Meninggalkan sistem selama 136 menit (termasuk waktu offline pada shift aktif).	0.00	\N	4	2	\N	2026-06-13 20:17:32.998169
53	1	IDLE_TIMEOUT	Meninggalkan sistem selama 45 menit (termasuk waktu offline pada shift aktif).	0.00	\N	4	2	\N	2026-06-13 20:46:13.417188
54	1	IDLE_TIMEOUT	Meninggalkan sistem selama 45 menit (termasuk waktu offline pada shift aktif).	0.00	\N	4	2	\N	2026-06-13 20:46:13.54824
55	1	IDLE_TIMEOUT	Meninggalkan sistem selama 125 menit (termasuk waktu offline pada shift aktif).	0.00	\N	4	2	\N	2026-06-13 23:00:18.392195
56	1	IDLE_TIMEOUT	Meninggalkan sistem selama 10 menit (termasuk waktu offline pada shift aktif).	0.00	\N	4	2	\N	2026-06-13 23:14:19.365002
57	1	IDLE_TIMEOUT	Meninggalkan sistem selama 10 menit (termasuk waktu offline pada shift aktif).	0.00	\N	4	2	\N	2026-06-13 23:24:28.351481
58	1	IDLE_TIMEOUT	Meninggalkan sistem selama 20 menit (termasuk waktu offline pada shift aktif).	0.00	\N	4	2	\N	2026-06-13 23:45:20.465589
59	1	IDLE_TIMEOUT	Meninggalkan sistem selama 20 menit (termasuk waktu offline pada shift aktif).	0.00	\N	4	2	\N	2026-06-13 23:45:20.540197
60	1	IDLE_TIMEOUT	Meninggalkan sistem selama 24 menit (termasuk waktu offline pada shift aktif).	0.00	\N	4	2	\N	2026-06-14 00:10:19.775728
61	1	IDLE_TIMEOUT	Meninggalkan sistem selama 58 menit (termasuk waktu offline pada shift aktif).	0.00	\N	4	2	\N	2026-06-14 01:09:21.536992
62	1	IDLE_TIMEOUT	Meninggalkan sistem selama 19 menit (termasuk waktu offline pada shift aktif).	0.00	\N	4	2	\N	2026-06-14 01:28:57.711198
63	1	IDLE_TIMEOUT	Meninggalkan sistem selama 32 menit (termasuk waktu offline pada shift aktif).	0.00	\N	4	2	\N	2026-06-14 02:01:11.773855
64	1	IDLE_TIMEOUT	Meninggalkan sistem selama 32 menit (termasuk waktu offline pada shift aktif).	0.00	\N	4	2	\N	2026-06-14 02:01:11.843958
65	1	IDLE_TIMEOUT	Meninggalkan sistem selama 43 menit (termasuk waktu offline pada shift aktif).	0.00	\N	4	2	\N	2026-06-14 02:45:07.462878
66	1	IDLE_TIMEOUT	Meninggalkan sistem selama 5 menit (termasuk waktu offline pada shift aktif).	0.00	\N	4	2	\N	2026-06-14 02:50:23.735175
67	1	IDLE_TIMEOUT	Meninggalkan sistem selama 5 menit (termasuk waktu offline pada shift aktif).	0.00	\N	4	2	\N	2026-06-14 02:50:23.818596
68	3	IDLE_TIMEOUT	Meninggalkan sistem selama 9 menit (termasuk waktu offline pada shift aktif).	0.00	\N	5	3	\N	2026-06-14 10:29:02.130561
69	3	IDLE_TIMEOUT	Meninggalkan sistem selama 25 menit (termasuk waktu offline pada shift aktif).	0.00	\N	5	3	\N	2026-06-14 11:11:47.117806
70	3	IDLE_TIMEOUT	Meninggalkan sistem selama 8 menit (termasuk waktu offline pada shift aktif).	0.00	\N	5	3	\N	2026-06-14 11:31:32.120978
71	1	IDLE_TIMEOUT	Meninggalkan sistem selama 395 menit (termasuk waktu offline pada shift aktif).	0.00	\N	5	3	\N	2026-06-14 11:34:54.424459
72	3	IDLE_TIMEOUT	Meninggalkan sistem selama 13 menit (termasuk waktu offline pada shift aktif).	0.00	\N	5	3	\N	2026-06-14 11:51:17.10249
73	3	IDLE_TIMEOUT	Meninggalkan sistem selama 7 menit (termasuk waktu offline pada shift aktif).	0.00	\N	5	3	\N	2026-06-14 12:13:32.106718
74	3	IDLE_TIMEOUT	Meninggalkan sistem selama 15 menit (termasuk waktu offline pada shift aktif).	0.00	\N	5	3	\N	2026-06-14 12:35:12.122954
75	3	IDLE_TIMEOUT	Meninggalkan sistem selama 5 menit (termasuk waktu offline pada shift aktif).	0.00	\N	5	3	\N	2026-06-14 13:12:47.117436
76	3	IDLE_TIMEOUT	Meninggalkan sistem selama 11 menit (termasuk waktu offline pada shift aktif).	0.00	\N	5	3	\N	2026-06-14 13:51:42.105698
77	3	IDLE_TIMEOUT	Meninggalkan sistem selama 8 menit (termasuk waktu offline pada shift aktif).	0.00	\N	5	3	\N	2026-06-14 14:37:22.096635
78	3	IDLE_TIMEOUT	Meninggalkan sistem selama 7 menit (termasuk waktu offline pada shift aktif).	0.00	\N	5	3	\N	2026-06-14 15:00:47.096976
79	1	IDLE_TIMEOUT	Meninggalkan sistem selama 222 menit (termasuk waktu offline pada shift aktif).	0.00	\N	5	3	\N	2026-06-14 15:19:10.573013
80	3	IDLE_TIMEOUT	Meninggalkan sistem selama 10 menit (termasuk waktu offline pada shift aktif).	0.00	\N	5	3	\N	2026-06-14 16:27:52.107784
81	3	IDLE_TIMEOUT	Meninggalkan sistem selama 11 menit (termasuk waktu offline pada shift aktif).	0.00	\N	5	3	\N	2026-06-14 16:52:17.111235
82	4	IDLE_TIMEOUT	Meninggalkan sistem selama 9 menit (termasuk waktu offline pada shift aktif).	0.00	\N	6	3	\N	2026-06-14 17:34:10.150868
83	4	IDLE_TIMEOUT	Meninggalkan sistem selama 13 menit (termasuk waktu offline pada shift aktif).	0.00	\N	6	3	\N	2026-06-14 18:02:40.153228
84	4	IDLE_TIMEOUT	Meninggalkan sistem selama 5 menit (termasuk waktu offline pada shift aktif).	0.00	\N	6	3	\N	2026-06-14 19:11:05.153552
85	4	IDLE_TIMEOUT	Meninggalkan sistem selama 5 menit (termasuk waktu offline pada shift aktif).	0.00	\N	6	3	\N	2026-06-14 20:34:30.156203
86	4	IDLE_TIMEOUT	Meninggalkan sistem selama 6 menit (termasuk waktu offline pada shift aktif).	0.00	\N	6	3	\N	2026-06-14 21:16:35.154738
87	4	IDLE_TIMEOUT	Meninggalkan sistem selama 7 menit (termasuk waktu offline pada shift aktif).	0.00	\N	6	3	\N	2026-06-14 21:56:10.154448
88	1	IDLE_TIMEOUT	Meninggalkan sistem selama 52 menit (termasuk waktu offline pada shift aktif).	0.00	\N	6	3	\N	2026-06-15 01:01:22.32864
89	1	IDLE_TIMEOUT	Meninggalkan sistem selama 17 menit (termasuk waktu offline pada shift aktif).	0.00	\N	6	3	\N	2026-06-15 01:20:14.230783
90	1	IDLE_TIMEOUT	Meninggalkan sistem selama 34 menit (termasuk waktu offline pada shift aktif).	0.00	\N	6	3	\N	2026-06-15 01:58:19.864042
91	1	IDLE_TIMEOUT	Meninggalkan sistem selama 107 menit (termasuk waktu offline pada shift aktif).	0.00	\N	6	3	\N	2026-06-15 03:46:38.273342
92	4	IDLE_TIMEOUT	Meninggalkan sistem selama 247 menit (termasuk waktu offline pada shift aktif).	0.00	\N	\N	3	\N	2026-06-15 04:20:20.687631
93	4	IDLE_TIMEOUT	Meninggalkan sistem selama 338 menit (termasuk waktu offline pada shift aktif).	0.00	\N	\N	4	\N	2026-06-15 09:59:49.320481
94	4	IDLE_TIMEOUT	Meninggalkan sistem selama 12 menit (termasuk waktu offline pada shift aktif).	0.00	\N	7	4	\N	2026-06-15 10:55:06.343829
95	4	IDLE_TIMEOUT	Meninggalkan sistem selama 16 menit (termasuk waktu offline pada shift aktif).	0.00	\N	7	4	\N	2026-06-15 11:22:06.330802
96	4	IDLE_TIMEOUT	Meninggalkan sistem selama 33 menit (termasuk waktu offline pada shift aktif).	0.00	\N	7	4	\N	2026-06-15 12:11:11.336673
97	4	IDLE_TIMEOUT	Meninggalkan sistem selama 29 menit (termasuk waktu offline pada shift aktif).	0.00	\N	7	4	\N	2026-06-15 13:18:41.343287
98	4	IDLE_TIMEOUT	Meninggalkan sistem selama 21 menit (termasuk waktu offline pada shift aktif).	0.00	\N	7	4	\N	2026-06-15 13:45:36.336036
99	4	IDLE_TIMEOUT	Meninggalkan sistem selama 12 menit (termasuk waktu offline pada shift aktif).	0.00	\N	7	4	\N	2026-06-15 14:11:21.332456
100	4	IDLE_TIMEOUT	Meninggalkan sistem selama 6 menit (termasuk waktu offline pada shift aktif).	0.00	\N	7	4	\N	2026-06-15 14:43:51.330414
101	4	IDLE_TIMEOUT	Meninggalkan sistem selama 7 menit (termasuk waktu offline pada shift aktif).	0.00	\N	7	4	\N	2026-06-15 15:19:41.338538
102	4	IDLE_TIMEOUT	Meninggalkan sistem selama 10 menit (termasuk waktu offline pada shift aktif).	0.00	\N	7	4	\N	2026-06-15 15:43:56.334846
103	4	IDLE_TIMEOUT	Meninggalkan sistem selama 8 menit (termasuk waktu offline pada shift aktif).	0.00	\N	7	4	\N	2026-06-15 16:02:56.337143
104	4	IDLE_TIMEOUT	Meninggalkan sistem selama 9 menit (termasuk waktu offline pada shift aktif).	0.00	\N	7	4	\N	2026-06-15 16:19:46.338256
105	4	IDLE_TIMEOUT	Meninggalkan sistem selama 23 menit (termasuk waktu offline pada shift aktif).	0.00	\N	7	4	\N	2026-06-15 16:48:31.333029
106	4	IDLE_TIMEOUT	Meninggalkan sistem selama 16 menit (termasuk waktu offline pada shift aktif).	0.00	\N	7	4	\N	2026-06-15 17:20:36.339426
107	4	IDLE_TIMEOUT	Meninggalkan sistem selama 5 menit (termasuk waktu offline pada shift aktif).	0.00	\N	8	4	\N	2026-06-15 17:36:23.484469
108	4	IDLE_TIMEOUT	Meninggalkan sistem selama 6 menit (termasuk waktu offline pada shift aktif).	0.00	\N	8	4	\N	2026-06-15 18:00:23.47377
109	4	IDLE_TIMEOUT	Meninggalkan sistem selama 5 menit (termasuk waktu offline pada shift aktif).	0.00	\N	8	4	\N	2026-06-15 18:21:48.469586
110	4	IDLE_TIMEOUT	Meninggalkan sistem selama 5 menit (termasuk waktu offline pada shift aktif).	0.00	\N	8	4	\N	2026-06-15 18:28:22.50545
111	1	IDLE_TIMEOUT	Meninggalkan sistem selama 7 menit (termasuk waktu offline pada shift aktif).	0.00	\N	8	4	\N	2026-06-15 18:28:28.548328
112	4	IDLE_TIMEOUT	Meninggalkan sistem selama 16 menit (termasuk waktu offline pada shift aktif).	0.00	\N	8	4	\N	2026-06-15 18:58:28.467234
113	4	IDLE_TIMEOUT	Meninggalkan sistem selama 9 menit (termasuk waktu offline pada shift aktif).	0.00	\N	8	4	\N	2026-06-15 19:30:53.471323
114	4	IDLE_TIMEOUT	Meninggalkan sistem selama 9 menit (termasuk waktu offline pada shift aktif).	0.00	\N	8	4	\N	2026-06-15 20:14:23.471164
115	4	IDLE_TIMEOUT	Meninggalkan sistem selama 6 menit (termasuk waktu offline pada shift aktif).	0.00	\N	8	4	\N	2026-06-15 22:56:42.973662
116	4	IDLE_TIMEOUT	Meninggalkan sistem selama 9 menit (termasuk waktu offline pada shift aktif).	0.00	\N	8	4	\N	2026-06-16 00:40:58.863764
117	4	IDLE_TIMEOUT	Meninggalkan sistem selama 52 menit (termasuk waktu offline pada shift aktif).	0.00	\N	8	4	\N	2026-06-16 01:39:13.90473
118	4	IDLE_TIMEOUT	Meninggalkan sistem selama 5 menit (termasuk waktu offline pada shift aktif).	0.00	\N	8	4	\N	2026-06-16 01:52:38.860589
119	5	IDLE_TIMEOUT	Meninggalkan sistem selama 36 menit (termasuk waktu offline pada shift aktif).	0.00	\N	\N	4	\N	2026-06-16 02:10:03.066762
120	1	IDLE_TIMEOUT	Meninggalkan sistem selama 35 menit (termasuk waktu offline pada shift aktif).	0.00	\N	\N	4	\N	2026-06-16 02:56:17.0225
121	1	IDLE_TIMEOUT	Meninggalkan sistem selama 35 menit (termasuk waktu offline pada shift aktif).	0.00	\N	\N	4	\N	2026-06-16 02:56:17.152552
122	1	IDLE_TIMEOUT	Meninggalkan sistem selama 23 menit (termasuk waktu offline pada shift aktif).	0.00	\N	\N	4	\N	2026-06-16 03:20:09.975904
123	3	IDLE_TIMEOUT	Meninggalkan sistem selama 10 menit (termasuk waktu offline pada shift aktif).	0.00	\N	9	7	\N	2026-06-16 10:27:38.506448
124	3	IDLE_TIMEOUT	Meninggalkan sistem selama 10 menit (termasuk waktu offline pada shift aktif).	0.00	\N	9	7	\N	2026-06-16 10:43:43.493763
125	3	IDLE_TIMEOUT	Meninggalkan sistem selama 5 menit (termasuk waktu offline pada shift aktif).	0.00	\N	9	7	\N	2026-06-16 11:15:08.51941
126	4	IDLE_TIMEOUT	Meninggalkan sistem selama 13 menit (termasuk waktu offline pada shift aktif).	0.00	\N	10	7	\N	2026-06-16 18:18:49.979077
127	4	IDLE_TIMEOUT	Meninggalkan sistem selama 10 menit (termasuk waktu offline pada shift aktif).	0.00	\N	10	7	\N	2026-06-16 18:52:44.979148
128	4	IDLE_TIMEOUT	Meninggalkan sistem selama 11 menit (termasuk waktu offline pada shift aktif).	0.00	\N	10	7	\N	2026-06-16 20:53:04.995344
129	4	IDLE_TIMEOUT	Meninggalkan sistem selama 6 menit (termasuk waktu offline pada shift aktif).	0.00	\N	10	7	\N	2026-06-16 21:50:39.972568
130	4	IDLE_TIMEOUT	Meninggalkan sistem selama 5 menit (termasuk waktu offline pada shift aktif).	0.00	\N	10	7	\N	2026-06-16 22:23:29.974633
131	1	IDLE_TIMEOUT	Meninggalkan sistem selama 90 menit (termasuk waktu offline pada shift aktif).	0.00	\N	10	7	\N	2026-06-16 23:21:44.337999
132	4	IDLE_TIMEOUT	Meninggalkan sistem selama 5 menit (termasuk waktu offline pada shift aktif).	0.00	\N	10	7	\N	2026-06-17 00:22:35.010827
133	4	IDLE_TIMEOUT	Meninggalkan sistem selama 12 menit (termasuk waktu offline pada shift aktif).	0.00	\N	10	7	\N	2026-06-17 00:54:05.013308
134	4	IDLE_TIMEOUT	Meninggalkan sistem selama 17 menit (termasuk waktu offline pada shift aktif).	0.00	\N	10	7	\N	2026-06-17 01:19:09.975997
135	4	IDLE_TIMEOUT	Meninggalkan sistem selama 6 menit (termasuk waktu offline pada shift aktif).	0.00	\N	10	7	\N	2026-06-17 01:31:04.990779
136	1	IDLE_TIMEOUT	Meninggalkan sistem selama 194 menit (termasuk waktu offline pada shift aktif).	0.00	\N	\N	7	\N	2026-06-17 02:39:18.245269
137	1	IDLE_TIMEOUT	Meninggalkan sistem selama 194 menit (termasuk waktu offline pada shift aktif).	0.00	\N	\N	7	\N	2026-06-17 02:39:18.293239
138	1	IDLE_TIMEOUT	Meninggalkan sistem selama 8 menit (termasuk waktu offline pada shift aktif).	0.00	\N	\N	6	\N	2026-06-17 03:00:12.698607
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

SELECT pg_catalog.setval('public.ai_upsell_prompts_id_seq', 16, true);


--
-- Name: approval_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.approval_history_id_seq', 27, true);


--
-- Name: approval_requests_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.approval_requests_id_seq', 25, true);


--
-- Name: asset_categories_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.asset_categories_id_seq', 3, true);


--
-- Name: attendances_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.attendances_id_seq', 49, true);


--
-- Name: audit_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.audit_logs_id_seq', 698, true);


--
-- Name: battle_plan_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.battle_plan_items_id_seq', 274, true);


--
-- Name: battle_plans_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.battle_plans_id_seq', 6, true);


--
-- Name: billiard_packages_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.billiard_packages_id_seq', 22, true);


--
-- Name: business_closures_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.business_closures_id_seq', 1, false);


--
-- Name: business_days_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.business_days_id_seq', 8, true);


--
-- Name: cafe_tables_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.cafe_tables_id_seq', 12, true);


--
-- Name: cashflow_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.cashflow_id_seq', 157, true);


--
-- Name: categories_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.categories_id_seq', 6, true);


--
-- Name: chat_messages_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.chat_messages_id_seq', 14, true);


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

SELECT pg_catalog.setval('public.ingredients_id_seq', 153, true);


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

SELECT pg_catalog.setval('public.menu_items_id_seq', 80, true);


--
-- Name: missions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.missions_id_seq', 3, true);


--
-- Name: order_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.order_items_id_seq', 200, true);


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

SELECT pg_catalog.setval('public.product_finances_id_seq', 77, true);


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

SELECT pg_catalog.setval('public.recipes_id_seq', 117, true);


--
-- Name: roles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.roles_id_seq', 4, true);


--
-- Name: sessions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.sessions_id_seq', 154, true);


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

SELECT pg_catalog.setval('public.shifts_id_seq', 10, true);


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

SELECT pg_catalog.setval('public.transaction_payments_id_seq', 157, true);


--
-- Name: transactions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.transactions_id_seq', 155, true);


--
-- Name: user_status_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.user_status_logs_id_seq', 1994, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 5, true);


--
-- Name: violations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.violations_id_seq', 138, true);


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

\unrestrict bNkPCaG13x5NseLVK68jQnoTcWxT0gyoVLxLz3EINsPneMZpyv4zzvLS9arrimd

