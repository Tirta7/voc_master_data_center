--
-- PostgreSQL database dump
--

\restrict EOuPyyrgRxUPBrgMn4Z4sWrXBdsLUl7ajBtbjfGMteYSrW7Ihxo6yReybZyGYmp

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
    'TABLE_ACCESS'
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
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
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
\.


--
-- Data for Name: approval_requests; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.approval_requests (id, "moduleType", "referenceId", "requiredLevels", "currentLevelIndex", status, metadata, "requestedByUserId", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: asset_categories; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.asset_categories (id, name, description, "assetType", "isActive", "createdAt", "updatedAt") FROM stdin;
1	REGULER	Meja Umum	BILLIARD	t	2026-06-11 04:43:31.406678	2026-06-11 04:43:31.406678
2	VIP	Meja Vip	BILLIARD	t	2026-06-11 04:43:46.190066	2026-06-11 04:43:46.190066
3	VVIP	Meja VVIP	BILLIARD	t	2026-06-11 04:43:56.615385	2026-06-11 04:43:56.615385
\.


--
-- Data for Name: attendances; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.attendances (id, "userId", date, "checkInTime", "checkOutTime", "workDurationMinutes", status, "isApproved", "approvedBy", "approvedAt", "overtimeMinutes", "isManual", "shiftName", note, "createdAt", "updatedAt", "payrollReleaseId") FROM stdin;
\.


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.audit_logs (id, action, "user", details, "tableId", "invoiceNumber", "createdAt") FROM stdin;
1	UPDATE_SETTINGS	admin	Ubah pengaturan: businessName: "My Billiard & Cafe" -> "SCUFF BILLIARD", bounceBackConfig: [{"tierName":"Tier 1 - Pelanggan Reguler","minAmount":50000,"maxAmount":100000,"rewardType":"FREE_ITEM","rewardValue":1,"minClaimTransaction":0,"expiryDays":7},{"tierName":"Tier 2 - Pelanggan Setia","minAmount":100001,"maxAmount":250000,"rewardType":"DISCOUNT_FIXED","rewardValue":15000,"minClaimTransaction":50000,"expiryDays":14},{"tierName":"Tier 3 - Pelanggan VIP","minAmount":250001,"maxAmount":99999999,"rewardType":"FREE_BILLIARD_MINUTES","rewardValue":60,"minClaimTransaction":0,"expiryDays":30}] -> [{"tierName":"Tier 1 - Pelanggan Reguler","minAmount":50000,"maxAmount":100000,"rewardType":"FREE_ITEM","rewardValue":1,"minClaimTransaction":0,"expiryDays":7},{"tierName":"Tier 2 - Pelanggan Setia","minAmount":100001,"maxAmount":250000,"rewardType":"DISCOUNT_FIXED","rewardValue":15000,"minClaimTransaction":50000,"expiryDays":14},{"tierName":"Tier 3 - Pelanggan VIP","minAmount":250001,"maxAmount":99999999,"rewardType":"FREE_BILLIARD_MINUTES","rewardValue":60,"minClaimTransaction":0,"expiryDays":30}]	\N	\N	2026-06-11 04:41:31.412407
2	UPDATE_SETTINGS	admin	Ubah pengaturan: gamificationTargetSurplus: 5000000 -> 100000000	\N	\N	2026-06-11 05:19:06.950823
3	UPDATE_SETTINGS	admin	Ubah pengaturan: customPricingDynamic: null -> [{"categoryId":1,"basePrice":25000,"timeSlots":[{"start":"10:00","end":"17:00","price":25000},{"start":"17:00","end":"02:00","price":25000}]}]	\N	\N	2026-06-11 06:10:07.865784
4	UPDATE_SETTINGS	admin	Ubah pengaturan: customPricingDynamic: [{"categoryId":1,"basePrice":25000,"timeSlots":[{"start":"10:00","end":"17:00","price":25000},{"start":"17:00","end":"02:00","price":25000}]}] -> [{"categoryId":1,"basePrice":25000,"timeSlots":[{"start":"10:00","end":"17:00","price":25000},{"start":"17:00","end":"02:00","price":25000},{"start":"00:00","end":"00:00","price":25000},{"start":"00:00","end":"00:00","price":25000}]},{"categoryId":4,"basePrice":350,"timeSlots":[{"start":"10:00","end":"17:00","price":350},{"start":"17:00","end":"02:00","price":"500"}]}]	\N	\N	2026-06-11 06:12:42.512535
5	UPDATE_SETTINGS	admin	Ubah pengaturan: customPricingDynamic: [{"categoryId":1,"basePrice":25000,"timeSlots":[{"start":"10:00","end":"17:00","price":25000},{"start":"17:00","end":"02:00","price":25000},{"start":"00:00","end":"00:00","price":25000},{"start":"00:00","end":"00:00","price":25000}]},{"categoryId":4,"basePrice":350,"timeSlots":[{"start":"10:00","end":"17:00","price":350},{"start":"17:00","end":"02:00","price":"500"}]}] -> [{"categoryId":1,"basePrice":0,"timeSlots":[]},{"categoryId":4,"basePrice":0,"timeSlots":[]}]	\N	\N	2026-06-11 07:08:14.332723
6	UPDATE_SETTINGS	admin	Ubah pengaturan: businessDayOffset: "00:00" -> "03:00", customPricingDynamic: [{"categoryId":1,"basePrice":0,"timeSlots":[]},{"categoryId":4,"basePrice":0,"timeSlots":[]}] -> [{"categoryId":1,"basePrice":0,"timeSlots":[]},{"categoryId":4,"basePrice":0,"timeSlots":[]}], availableShifts: null -> [{"name":"SHIFT 1","startTime":"10:00","endTime":"18:00"},{"name":"SHIFT 2","startTime":"18:00","endTime":"15:00"}], bounceBackConfig: [{"tierName":"Tier 1 - Pelanggan Reguler","minAmount":50000,"maxAmount":100000,"rewardType":"FREE_ITEM","rewardValue":1,"minClaimTransaction":0,"expiryDays":7},{"tierName":"Tier 2 - Pelanggan Setia","minAmount":100001,"maxAmount":250000,"rewardType":"DISCOUNT_FIXED","rewardValue":15000,"minClaimTransaction":50000,"expiryDays":14},{"tierName":"Tier 3 - Pelanggan VIP","minAmount":250001,"maxAmount":99999999,"rewardType":"FREE_BILLIARD_MINUTES","rewardValue":60,"minClaimTransaction":0,"expiryDays":30}] -> [{"tierName":"Tier 1 - Pelanggan Reguler","minAmount":50000,"maxAmount":100000,"rewardType":"FREE_ITEM","rewardValue":1,"minClaimTransaction":0,"expiryDays":7},{"tierName":"Tier 2 - Pelanggan Setia","minAmount":100001,"maxAmount":250000,"rewardType":"DISCOUNT_FIXED","rewardValue":15000,"minClaimTransaction":50000,"expiryDays":14},{"tierName":"Tier 3 - Pelanggan VIP","minAmount":250001,"maxAmount":99999999,"rewardType":"FREE_BILLIARD_MINUTES","rewardValue":60,"minClaimTransaction":0,"expiryDays":30}]	\N	\N	2026-06-11 07:24:04.508401
7	UPDATE_SETTINGS	admin	Ubah pengaturan: roundingKelipatan: 100 -> 500, availablePaymentMethods: null -> ["CASH","TRANSFER","QRIS","BCA"], customPricingDynamic: [{"categoryId":1,"basePrice":0,"timeSlots":[]},{"categoryId":4,"basePrice":0,"timeSlots":[]}] -> [{"categoryId":1,"basePrice":0,"timeSlots":[]},{"categoryId":4,"basePrice":0,"timeSlots":[]}], availableShifts: [{"name":"SHIFT 1","startTime":"10:00","endTime":"18:00"},{"name":"SHIFT 2","startTime":"18:00","endTime":"15:00"}] -> [{"name":"SHIFT 1","startTime":"10:00","endTime":"18:00"},{"name":"SHIFT 2","startTime":"18:00","endTime":"15:00"}], bounceBackConfig: [{"tierName":"Tier 1 - Pelanggan Reguler","minAmount":50000,"maxAmount":100000,"rewardType":"FREE_ITEM","rewardValue":1,"minClaimTransaction":0,"expiryDays":7},{"tierName":"Tier 2 - Pelanggan Setia","minAmount":100001,"maxAmount":250000,"rewardType":"DISCOUNT_FIXED","rewardValue":15000,"minClaimTransaction":50000,"expiryDays":14},{"tierName":"Tier 3 - Pelanggan VIP","minAmount":250001,"maxAmount":99999999,"rewardType":"FREE_BILLIARD_MINUTES","rewardValue":60,"minClaimTransaction":0,"expiryDays":30}] -> [{"tierName":"Tier 1 - Pelanggan Reguler","minAmount":50000,"maxAmount":100000,"rewardType":"FREE_ITEM","rewardValue":1,"minClaimTransaction":0,"expiryDays":7},{"tierName":"Tier 2 - Pelanggan Setia","minAmount":100001,"maxAmount":250000,"rewardType":"DISCOUNT_FIXED","rewardValue":15000,"minClaimTransaction":50000,"expiryDays":14},{"tierName":"Tier 3 - Pelanggan VIP","minAmount":250001,"maxAmount":99999999,"rewardType":"FREE_BILLIARD_MINUTES","rewardValue":60,"minClaimTransaction":0,"expiryDays":30}]	\N	\N	2026-06-11 07:24:43.048886
8	UPDATE_SETTINGS	admin	Ubah pengaturan: customPricingDynamic: [{"categoryId":1,"basePrice":0,"timeSlots":[]},{"categoryId":4,"basePrice":0,"timeSlots":[]}] -> [{"categoryId":1,"basePrice":20000,"timeSlots":[{"start":"10:00","end":"17:00","price":0},{"start":"","end":"02:00","price":"25000"}]},{"categoryId":4,"basePrice":0,"timeSlots":[]}]	\N	\N	2026-06-11 20:10:52.299031
9	UPDATE_SETTINGS	admin	Ubah pengaturan: customPricingDynamic: [{"categoryId":1,"basePrice":20000,"timeSlots":[{"start":"10:00","end":"17:00","price":0},{"start":"","end":"02:00","price":"25000"}]},{"categoryId":4,"basePrice":0,"timeSlots":[]}] -> [{"categoryId":1,"basePrice":20000,"timeSlots":[{"start":"10:00","end":"17:00","price":0},{"start":"","end":"02:00","price":"25000"}]},{"categoryId":4,"basePrice":0,"timeSlots":[]}]	\N	\N	2026-06-11 20:11:17.084652
10	UPDATE_SETTINGS	admin	Ubah pengaturan: customPricingDynamic: [{"categoryId":1,"basePrice":20000,"timeSlots":[{"start":"10:00","end":"17:00","price":0},{"start":"","end":"02:00","price":"25000"}]},{"categoryId":4,"basePrice":0,"timeSlots":[]}] -> [{"categoryId":1,"basePrice":20000,"timeSlots":[{"start":"10:00","end":"17:00","price":0},{"start":"","end":"02:00","price":"25000"}]},{"categoryId":4,"basePrice":0,"timeSlots":[]}]	\N	\N	2026-06-11 20:11:20.029284
11	UPDATE_SETTINGS	admin	Ubah pengaturan: availablePaymentMethods: ["CASH","TRANSFER","QRIS","BCA"] -> ["CASH","TRANSFER","QRIS","BCA"], customPricingDynamic: [{"categoryId":1,"basePrice":20000,"timeSlots":[{"start":"10:00","end":"17:00","price":0},{"start":"","end":"02:00","price":"25000"}]},{"categoryId":4,"basePrice":0,"timeSlots":[]}] -> [{"categoryId":1,"basePrice":20000,"timeSlots":[{"start":"10:00","end":"17:00","price":0},{"start":"","end":"02:00","price":"25000"}]},{"categoryId":4,"basePrice":0,"timeSlots":[]}], availableShifts: [{"name":"SHIFT 1","startTime":"10:00","endTime":"18:00"},{"name":"SHIFT 2","startTime":"18:00","endTime":"15:00"}] -> [{"name":"SHIFT 1","startTime":"10:00","endTime":"18:00"},{"name":"SHIFT 2","startTime":"18:00","endTime":"15:00"}], bounceBackConfig: [{"tierName":"Tier 1 - Pelanggan Reguler","minAmount":50000,"maxAmount":100000,"rewardType":"FREE_ITEM","rewardValue":1,"minClaimTransaction":0,"expiryDays":7},{"tierName":"Tier 2 - Pelanggan Setia","minAmount":100001,"maxAmount":250000,"rewardType":"DISCOUNT_FIXED","rewardValue":15000,"minClaimTransaction":50000,"expiryDays":14},{"tierName":"Tier 3 - Pelanggan VIP","minAmount":250001,"maxAmount":99999999,"rewardType":"FREE_BILLIARD_MINUTES","rewardValue":60,"minClaimTransaction":0,"expiryDays":30}] -> [{"tierName":"Tier 1 - Pelanggan Reguler","minAmount":50000,"maxAmount":100000,"rewardType":"FREE_ITEM","rewardValue":1,"minClaimTransaction":0,"expiryDays":7},{"tierName":"Tier 2 - Pelanggan Setia","minAmount":100001,"maxAmount":250000,"rewardType":"DISCOUNT_FIXED","rewardValue":15000,"minClaimTransaction":50000,"expiryDays":14},{"tierName":"Tier 3 - Pelanggan VIP","minAmount":250001,"maxAmount":99999999,"rewardType":"FREE_BILLIARD_MINUTES","rewardValue":60,"minClaimTransaction":0,"expiryDays":30}]	\N	\N	2026-06-11 22:45:16.865408
\.


--
-- Data for Name: battle_plan_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.battle_plan_items (id, "battlePlanId", "menuItemId", "packageId", "promoId", "targetQuantity", "soldQuantity", "aiLabel", "isAutoBroadcastEnabled") FROM stdin;
2	1	\N	1	\N	63	0	🔥 Laris	f
\.


--
-- Data for Name: battle_plans; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.battle_plans (id, "businessDayId", "targetRevenue", "predictedRevenue", status, "aiStrategyBrief", "createdAt", "updatedAt") FROM stdin;
1	1	1875000.00	0.00	DRAFT	Target Rev: Rp 1,875,000. Est. 25 pax (Avg: Rp 75,000). Trafik diprediksi stabil sepanjang hari. Prioritaskan 1 Paket Billiard untuk filling occupancy.	2026-06-11 07:00:00.409218	2026-06-11 07:00:00.553455
\.


--
-- Data for Name: billiard_packages; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.billiard_packages (id, name, "categoryId", type, "durationMinutes", price, "minutePrice", "timeSlots", "isActive", "createdAt", "updatedAt") FROM stdin;
1	 3 JAM WEEKDAYS	1	fixed	180	0.00	\N	[{"start":"10:00","end":"17:00","price":"50000"},{"start":"17:01","end":"02:00","price":"75000"}]	t	2026-06-11 06:14:54.783611	2026-06-11 20:45:49.958804
2	1 JAM WEEKDAYS 	1	fixed	60	0.00	\N	[{"start":"10:00","end":"17:00","price":"20000"},{"start":"17:00","end":"14:00","price":"25000"}]	t	2026-06-11 20:16:02.025619	2026-06-11 20:36:28.814095
11	3 JAM WEEKDAYS	3	fixed	180	0.00	\N	[{"start":"10:00","end":"17:00","price":"100000"},{"start":"17:00","end":"02:00","price":"115000"}]	t	2026-06-11 20:38:10.023649	2026-06-11 20:38:10.023649
13	1 JAM WEEKDAYS	3	fixed	60	0.00	\N	[{"start":"10:00","end":"17:00","price":"35000"},{"start":"17:00","end":"02:00","price":"40000"}]	t	2026-06-11 20:39:35.728288	2026-06-11 20:43:40.805891
14	1 JAM WEEKEND	3	fixed	60	0.00	\N	[{"start":"10:00","end":"17:00","price":"35000"},{"start":"17:00","end":"02:00","price":"45000"}]	t	2026-06-11 20:43:02.552329	2026-06-11 20:43:54.317516
12	3 JAM WEEKEND	3	fixed	180	0.00	\N	[{"start":"10:00","end":"17:00","price":"100000"},{"start":"17:00","end":"02:00","price":"130000"}]	t	2026-06-11 20:38:50.138119	2026-06-11 20:44:03.691964
10	3 JAM WEEKDAYS	2	fixed	180	0.00	\N	[{"start":"10:00","end":"17:00","price":"70000"},{"start":"17:00","end":"02:00","price":"85000"}]	t	2026-06-11 20:32:55.182782	2026-06-11 20:44:21.207905
8	1 JAM WEEKEND 	2	fixed	60	0.00	\N	[{"start":"10:00","end":"17:00","price":"25000"},{"start":"17:00","end":"02:00","price":"35000"}]	t	2026-06-11 20:28:45.316159	2026-06-11 20:44:33.091877
9	3 JAM WEEKEND 	2	fixed	180	0.00	\N	[{"start":"10:00","end":"17:00","price":"70000"},{"start":"17:00","end":"02:00","price":"100000"}]	t	2026-06-11 20:30:27.17168	2026-06-11 20:44:39.85045
7	1 JAM WEEKDAYS 	2	fixed	60	0.00	\N	[{"start":"10:00","end":"17:00","price":"25000"},{"start":"17:00","end":"02:00","price":"30000"}]	t	2026-06-11 20:27:40.964879	2026-06-11 20:44:55.717526
4	1 JAM WEEKEND 	1	fixed	60	0.00	\N	[{"start":"10:00","end":"17:00","price":"20000"},{"start":"17:00","end":"02:00","price":"30000"}]	t	2026-06-11 20:19:38.033969	2026-06-11 20:45:05.076159
6	 3 JAM WEEKEND	1	fixed	180	0.00	\N	[{"start":"10:00","end":"17:00","price":"55000"},{"start":"17:00","end":"02:00","price":"85000"}]	t	2026-06-11 20:24:22.841523	2026-06-11 20:45:41.137338
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
1	2026-06-11	2026-06-11 04:37:58.449	\N	f	0.00	0.00	0.00	f	2026-06-11 04:37:58.450338
\.


--
-- Data for Name: cafe_tables; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.cafe_tables (id, "tableName", capacity, status, "currentTransactionId", "currentCustomer", "isBooked", "bookedByWaitingId", "bookedByName", "createdAt", "updatedAt", "deletedAt") FROM stdin;
\.


--
-- Data for Name: cashflow; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.cashflow (id, amount, type, source, "referenceId", description, "paymentMethod", "timestamp", "balanceAfter", "businessDayId", "shiftId") FROM stdin;
1	10000.00	in	penalty	VIOLATION-1	[DENDA STAFF] Super Admin: Meninggalkan sistem selama 6 menit (termasuk waktu offline pada shift aktif).	\N	2026-06-11 05:07:22.622	0.00	1	\N
\.


--
-- Data for Name: categories; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.categories (id, name, type, "productionTarget", "isActive", "createdAt", "updatedAt") FROM stdin;
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
1	Daily Breecher	Main game apapun 3 kali hari ini	PLAY_ANY_GAME	5	3	t	Trophy	2026-06-11 04:37:37.682073
2	Bom Hunter	Main Scratch Bomb 5 kali	PLAY_SCRATCH	10	5	t	Target	2026-06-11 04:37:37.682073
3	Whale Apprentice	Capai total bet 50 poin	ACCUMULATE_BET	25	50	t	Zap	2026-06-11 04:37:37.682073
\.


--
-- Data for Name: order_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.order_items (id, status, "transactionId", "menuItemId", quantity, "priceAtOrder", "discountPercentage", "discountAmount", "isPaid", "paymentId", note, "customName", station, "bundleGroupId", "cancelledAt", "cancelledBy", "cancelReason", "completedByUserId", "completedAt", "createdByUserId", "commissionUserId", "payrollReleaseId", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: payroll_configs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.payroll_configs (id, "basicSalary", "overtimeRate", "commissionService", "commissionSalesPercent", "categoryCommissions", "penaltyLate", "penaltyIdle", "idleThreshold", "userId") FROM stdin;
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
1	ADMIN	["DASHBOARD_TABLE","START_TABLE","MOVE_TABLE","SWITCH_PACKAGE","SET_PRICE","VOID_BILLING","VIEW_MENU","ORDER_MENU","MANAGE_RETAIL","VOID_ORDER","ACCESS_KDS","ACCESS_BDS","VIEW_INVENTORY","UPDATE_INVENTORY","MANAGE_RECIPE","STOCK_ALERT","VIEW_REVENUE","VIEW_PROFIT_LOSS","MANAGE_EXPENSES","REPRINT_INVOICE","MANAGE_EMPLOYEES","MANAGE_PAYROLL","MONITOR_ACTIVITY","FORCE_LOGOUT","BILLIARD_PRICING","PROMO_MANAGE","BUSINESS_DAY_VIEW","BUSINESS_DAY_CLOSE","SHIFT_START","WAITING_LIST_VIEW","WAITING_LIST_MANAGE"]	0	\N
34	KASIR	["DASHBOARD_VIEW","DASHBOARD_TABLE","START_TABLE","STOP_TABLE","CAFE_ORDER","CAFE_VIEW","BILLING_VIEW","PAYMENT_PROCESS","TABLE_MANAGE","BILLIARD_PRICING","WAITING_LIST_VIEW","WAITING_LIST_MANAGE","DASHBOARD_CHART_VIEW","MEMBER_VIEW","MEMBER_MANAGE","MEMBER_TOPUP","CUSTOMER_FEEDBACK","BILLIARD_VIEW","BILLIARD_CARD_VIEW","BILLIARD_START","BILLIARD_EXTEND","BILLIARD_STOP","BILLIARD_PAY","BILLIARD_MOVE","BILLIARD_ORDER","BILLIARD_CANCEL_ITEM","BILLIARD_PREVIEW","BILLIARD_SWITCH","BILLIARD_MANAGE_TABLES","CAFE_CARD_VIEW","CAFE_START","CAFE_PAY","CAFE_TRANSFER","CAFE_CANCEL_ITEM","POS_ORDER_CREATE","POS_PAYMENT","POS_SHIFT","ORDER_CREATE","ORDER_EDIT","ORDER_CANCEL","ORDER_DISCOUNT","ORDER_VOID","PAYMENT_REFUND","INV_VIEW","INVENTORY_WASTE","INV_ADD_ITEM","INVENTORY_STOCK_OUT","INVENTORY_STOCK_IN","INVENTORY_RECEIVE","INV_EDIT_ITEM","INV_DELETE_ITEM","INV_RECIPE","INV_ADD_MENU","INV_EDIT_MENU","INV_DELETE_MENU","INV_TOGGLE_MENU","INV_ALERT","INVENTORY_STOCK_ADJUST","STOCK_TRANSFER","STOCK_OPNAME","SHIFT_START","USER_FORCE_LOGOUT","FIN_REVENUE","FIN_EXPENSES_VIEW","FIN_EXPENSES_ADD","FIN_LEDGER","FIN_PRINT_REPRINT","FIN_DEBTS","BUSINESS_DAY_VIEW","BUSINESS_DAY_CLOSE","REPORT_EXPORT","AR_LIST_VIEW","AR_PAYMENT","AR_SETTLE","SHIFT_REPORT","APPROVAL_VIEW","APPROVAL_ACTION","PROMO_MANAGE","MOVE_TABLE","SWITCH_PACKAGE","SET_PRICE","VOID_BILLING","VIEW_MENU","ORDER_MENU","MANAGE_RETAIL","VOID_ORDER","VIEW_INVENTORY","UPDATE_INVENTORY","MANAGE_RECIPE","STOCK_ALERT","VIEW_REVENUE","VIEW_PROFIT_LOSS","MANAGE_EXPENSES","REPRINT_INVOICE","MANAGE_EMPLOYEES","MANAGE_PAYROLL","MONITOR_ACTIVITY","FORCE_LOGOUT","TABLE_CONTROL_PANEL","AI_ARME_GAMIFICATION","GAMIFICATION_ANALYTICS","SCAN_REDEMPTION","REWARDS_CATALOG","LOCKER_MANAGE"]	0	Kasir (Full Billiard & Cafe)
\.


--
-- Data for Name: sessions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sessions (id, "memberId", "sessionType", "startTime", "endTime", "durationMinutes", "totalPrice", "isPaid", "createdAt", "updatedAt", "tableId") FROM stdin;
\.


--
-- Data for Name: settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.settings (id, "businessName", address, contact, "socialMediaLink", "logoPath", "ppnPercentage", "serviceChargePercentage", "roundingKelipatan", "businessDayOffset", "autoMaintenanceTime", "availablePaymentMethods", "mqttBrokerAddress", "tftWallpaper", "invoiceBusinessName", "invoiceAddress", "invoiceContact", "invoiceSocialMedia", "invoiceFooterNote", "customPricingDynamic", "availableShifts", "shiftEndingWarningMinutes", "endingSoonThreshold", "balanceBuffer", "balanceWarningMinutes", "royaltyPointsPerAmount", "royaltyPointRedeemValue", "scratchBombWinRate", "scratchBombRewards", "scratchBombAvgWinPts", "gamificationAutoPilot", "gamificationTargetSurplus", "scratchBombPlayCost", "pointExpiryDays", "scratchBombPool", "mahjongSlotWinRate", "mahjongSlotPool", "isEmergencyMode", "printerWidth", "displayPromotions", "ownerPhone", "autoReportEnabled", "reportSchedule", "waTemplateWelcome", "aiStaffingRatio", "aiAutoPromote", "aiAutoPromoteThreshold", "waTemplateSessionEnd", "autoSettlementEnabled", "autoSettlementTime", "approvalConfig", "bounceBackConfig", "isIotBypassed") FROM stdin;
1	SCUFF BILLIARD	\N	\N	\N	\N	0.00	0.00	500	03:00	03:00	["CASH","TRANSFER","QRIS","BCA"]	127.0.0.1	\N	\N	\N	\N	\N	\N	[{"categoryId":1,"basePrice":20000,"timeSlots":[{"start":"10:00","end":"17:00","price":0},{"start":"","end":"02:00","price":"25000"}]},{"categoryId":4,"basePrice":0,"timeSlots":[]}]	[{"name":"SHIFT 1","startTime":"10:00","endTime":"18:00"},{"name":"SHIFT 2","startTime":"18:00","endTime":"15:00"}]	10	5	2000	15	1000	200	5	1,2,5,10,20,50,100	25	f	100000000	2	90	0	15	0	f	80	\N	\N	f	23:55	\N	5	f	0.60	\N	f	04:00	\N	[{"tierName":"Tier 1 - Pelanggan Reguler","minAmount":50000,"maxAmount":100000,"rewardType":"FREE_ITEM","rewardValue":1,"minClaimTransaction":0,"expiryDays":7},{"tierName":"Tier 2 - Pelanggan Setia","minAmount":100001,"maxAmount":250000,"rewardType":"DISCOUNT_FIXED","rewardValue":15000,"minClaimTransaction":50000,"expiryDays":14},{"tierName":"Tier 3 - Pelanggan VIP","minAmount":250001,"maxAmount":99999999,"rewardType":"FREE_BILLIARD_MINUTES","rewardValue":60,"minClaimTransaction":0,"expiryDays":30}]	f
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
13	PS 1 (DELETED-1781129417044)	PLAYSTATION	\N		192.168.0.106	1			ESPNOW_NODE	available	-100	0	2026-06-11 05:10:15.099	t	1	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-06-11 05:05:01.177878	2026-06-11 05:10:17.050404	2026-06-11 05:10:17.044
10	Meja 10	BILLIARD	2	DCDA0C11F150	192.168.0.102	1			PCF8575	available	-55	77737	2026-06-12 02:23:10.241	f	9	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-06-11 04:51:57.831004	2026-06-12 02:23:10.241844	\N
2	Meja 2	BILLIARD	1	DCDA0C11F150	192.168.0.102	1			PCF8575	available	-55	77737	2026-06-12 02:23:10.243	f	1	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-06-11 04:48:46.77997	2026-06-12 02:23:10.244452	\N
5	Meja 5	BILLIARD	1	DCDA0C11F150	192.168.0.102	1			PCF8575	available	-55	77737	2026-06-12 02:23:10.246	f	4	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-06-11 04:50:13.773054	2026-06-12 02:23:10.247009	\N
12	Meja 12	BILLIARD	3	DCDA0C11F150	192.168.0.102	1			PCF8575	available	-58	77767	2026-06-12 02:23:40.23	f	11	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-06-11 04:52:46.467134	2026-06-12 02:23:40.231751	\N
6	Meja 6	BILLIARD	1	DCDA0C11F150	192.168.0.102	1			PCF8575	available	-58	77767	2026-06-12 02:23:40.235	f	5	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-06-11 04:50:33.79122	2026-06-12 02:23:40.23564	\N
1	Meja 1	BILLIARD	1	DCDA0C11F150	192.168.0.102	1			PCF8575	available	-58	77767	2026-06-12 02:23:40.236	f	0	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-06-11 04:44:21.614935	2026-06-12 02:23:40.237129	\N
8	Meja 8	BILLIARD	1	DCDA0C11F150	192.168.0.102	1			PCF8575	available	-58	77767	2026-06-12 02:23:40.238	f	7	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-06-11 04:51:14.452542	2026-06-12 02:23:40.238681	\N
3	Meja 3	BILLIARD	1	DCDA0C11F150	192.168.0.102	1			PCF8575	available	-58	77767	2026-06-12 02:23:40.239	f	2	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-06-11 04:49:33.466587	2026-06-12 02:23:40.240126	\N
9	Meja 9	BILLIARD	2	DCDA0C11F150	192.168.0.102	1			PCF8575	available	-58	77767	2026-06-12 02:23:40.241	f	8	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-06-11 04:51:35.433441	2026-06-12 02:23:40.241588	\N
4	Meja 4	BILLIARD	1	DCDA0C11F150	192.168.0.102	1			PCF8575	available	-58	77767	2026-06-12 02:23:40.242	f	3	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-06-11 04:49:52.261016	2026-06-12 02:23:40.24312	\N
7	Meja 7	BILLIARD	1	DCDA0C11F150	192.168.0.102	1			PCF8575	available	-58	77767	2026-06-12 02:23:40.246	f	6	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-06-11 04:50:53.383326	2026-06-12 02:23:40.246916	\N
11	Meja 11	BILLIARD	3	DCDA0C11F150	192.168.0.102	1			PCF8575	available	-58	77767	2026-06-12 02:23:40.247	f	10	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-06-11 04:52:20.440073	2026-06-12 02:23:40.248052	\N
\.


--
-- Data for Name: transaction_payments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.transaction_payments (id, "transactionId", "payerName", "itemsSubtotal", "billiardPortion", "discountAmount", "taxAmount", "serviceAmount", "roundingAmount", "totalPaid", "paymentMethod", "itemsSnapshot", "createdAt", "createdByUserId", "shiftId", "businessDayId") FROM stdin;
\.


--
-- Data for Name: transactions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.transactions (id, "invoiceNumber", "customerName", "customerPhone", "generatedBounceBackCode", "tableId", "cafeTableId", "memberId", status, type, "sessionType", "fareName", "startTime", "endTime", "sessionDuration", "billiardTotal", "cafeTotal", "grandTotal", "discountAmount", "vatAmount", "serviceChargeAmount", "roundingAmount", "paidAmount", "paymentDetails", "billingDetails", remarks, "appliedPromos", "createdByUserId", "openedByUserId", "commissionUserId", "paidByUserId", "shiftId", "businessDayId", "packageId", "awardedPoints", "awardedSpend", "payrollReleaseId", "voucherCode", "voucherId", "voucherDiscountAmount", "cashbackEarned", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: user_status_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_status_logs (id, status, "startedAt", "endedAt", "durationSeconds", "userId") FROM stdin;
1	OFFLINE	2026-06-11 04:37:38.795929	2026-06-11 04:37:57.637	18	1
3	ACTIVE	2026-06-11 04:37:58.258	\N	0	1
2	ACTIVE	2026-06-11 04:37:57.637	2026-06-11 04:37:58.357	0	1
4	ACTIVE	2026-06-11 04:37:58.357	2026-06-11 04:38:36.806	38	1
5	AWAY	2026-06-11 04:38:36.806	2026-06-11 04:38:37.126	0	1
6	OFFLINE	2026-06-11 04:38:37.126	2026-06-11 04:40:40.58	123	1
34	ACTIVE	2026-06-11 04:40:40.58	2026-06-11 04:40:40.65	0	1
86	ACTIVE	2026-06-11 05:16:56.967	2026-06-11 05:18:22.165	85	1
35	ACTIVE	2026-06-11 04:40:40.65	2026-06-11 04:41:17.95	37	1
36	AWAY	2026-06-11 04:41:17.916	\N	0	1
37	OFFLINE	2026-06-11 04:41:17.95	2026-06-11 04:41:18.262	0	1
38	ACTIVE	2026-06-11 04:41:18.262	2026-06-11 04:41:32.939	14	1
39	AWAY	2026-06-11 04:41:32.907	\N	0	1
40	OFFLINE	2026-06-11 04:41:32.939	2026-06-11 04:41:33.212	0	1
41	ACTIVE	2026-06-11 04:41:33.212	2026-06-11 04:41:43.642	10	1
42	AWAY	2026-06-11 04:41:43.642	2026-06-11 04:41:57.801	14	1
43	ACTIVE	2026-06-11 04:41:57.801	2026-06-11 04:41:57.832	0	1
44	ACTIVE	2026-06-11 04:41:57.832	2026-06-11 04:42:05.58	7	1
87	AWAY	2026-06-11 05:18:22.165	2026-06-11 05:20:08.178	106	1
45	AWAY	2026-06-11 04:42:05.58	2026-06-11 04:42:07.254	1	1
47	ACTIVE	2026-06-11 04:42:07.254	2026-06-11 04:42:09.275	2	1
48	AWAY	2026-06-11 04:42:09.275	\N	0	1
46	ACTIVE	2026-06-11 04:42:07.211	2026-06-11 04:42:09.311	2	1
49	OFFLINE	2026-06-11 04:42:09.311	2026-06-11 04:42:18.14	8	1
50	ACTIVE	2026-06-11 04:42:18.14	2026-06-11 04:42:18.553	0	1
51	ACTIVE	2026-06-11 04:42:18.553	2026-06-11 04:42:27.807	9	1
52	AWAY	2026-06-11 04:42:27.807	2026-06-11 04:42:50.872	23	1
53	ACTIVE	2026-06-11 04:42:50.872	2026-06-11 04:44:34.015	103	1
55	OFFLINE	2026-06-11 04:44:34.015	2026-06-11 04:44:34.339	0	1
56	ACTIVE	2026-06-11 04:44:34.339	2026-06-11 04:53:30.405	536	1
57	AWAY	2026-06-11 04:53:30.405	\N	0	1
54	AWAY	2026-06-11 04:44:33.991	2026-06-11 04:53:30.45	536	1
58	OFFLINE	2026-06-11 04:53:30.45	2026-06-11 04:54:39.349	68	1
59	ACTIVE	2026-06-11 04:54:39.349	2026-06-11 04:56:58.845	139	1
88	ACTIVE	2026-06-11 05:20:08.178	2026-06-11 05:20:14.682	6	1
60	AWAY	2026-06-11 04:56:58.845	2026-06-11 04:56:58.92	0	1
61	ACTIVE	2026-06-11 04:56:58.916	\N	0	1
62	ACTIVE	2026-06-11 04:56:58.92	2026-06-11 04:57:00.452	1	1
63	AWAY	2026-06-11 04:57:00.452	2026-06-11 04:57:07.522	7	1
64	ACTIVE	2026-06-11 04:57:07.522	2026-06-11 04:57:16.544	9	1
65	AWAY	2026-06-11 04:57:16.544	2026-06-11 04:57:21.166	4	1
66	ACTIVE	2026-06-11 04:57:21.166	2026-06-11 04:58:53.22	92	1
67	AWAY	2026-06-11 04:58:53.22	2026-06-11 04:59:00.647	7	1
68	ACTIVE	2026-06-11 04:59:00.623	\N	0	1
69	ACTIVE	2026-06-11 04:59:00.647	2026-06-11 04:59:11.919	11	1
89	AWAY	2026-06-11 05:20:14.682	2026-06-11 05:24:23.452	248	1
70	AWAY	2026-06-11 04:59:11.919	2026-06-11 05:01:02.955	111	1
71	ACTIVE	2026-06-11 05:01:02.569	\N	0	1
72	ACTIVE	2026-06-11 05:01:02.955	2026-06-11 05:01:22.529	19	1
73	AWAY	2026-06-11 05:01:22.529	2026-06-11 05:02:20.409	57	1
74	ACTIVE	2026-06-11 05:02:20.409	2026-06-11 05:08:23.707	363	1
75	AWAY	2026-06-11 05:08:23.707	2026-06-11 05:08:37.815	14	1
76	ACTIVE	2026-06-11 05:08:37.815	2026-06-11 05:14:30.717	352	1
77	AWAY	2026-06-11 05:14:30.717	2026-06-11 05:14:50.112	19	1
78	ACTIVE	2026-06-11 05:14:50.112	2026-06-11 05:15:39.852	49	1
79	AWAY	2026-06-11 05:15:39.852	2026-06-11 05:15:40.395	0	1
80	ACTIVE	2026-06-11 05:15:40.395	2026-06-11 05:16:04.921	24	1
81	AWAY	2026-06-11 05:16:04.921	2026-06-11 05:16:08.834	3	1
82	ACTIVE	2026-06-11 05:16:08.834	2026-06-11 05:16:16.125	7	1
83	AWAY	2026-06-11 05:16:16.125	2026-06-11 05:16:22.561	6	1
84	ACTIVE	2026-06-11 05:16:22.561	2026-06-11 05:16:27.637	5	1
85	AWAY	2026-06-11 05:16:27.637	2026-06-11 05:16:56.967	29	1
90	ACTIVE	2026-06-11 05:24:23.452	2026-06-11 05:26:32.528	129	1
112	ACTIVE	2026-06-11 05:36:23.859	2026-06-11 05:41:25.242	301	1
91	AWAY	2026-06-11 05:26:32.528	2026-06-11 05:29:29.749	177	1
92	ACTIVE	2026-06-11 05:29:29.696	\N	0	1
93	ACTIVE	2026-06-11 05:29:29.749	2026-06-11 05:29:33.081	3	1
94	AWAY	2026-06-11 05:29:33.081	2026-06-11 05:29:33.284	0	1
95	ACTIVE	2026-06-11 05:29:33.235	\N	0	1
96	ACTIVE	2026-06-11 05:29:33.284	2026-06-11 05:30:41.437	68	1
97	AWAY	2026-06-11 05:30:41.437	2026-06-11 05:30:44.671	3	1
98	ACTIVE	2026-06-11 05:30:44.671	2026-06-11 05:30:49.765	5	1
99	AWAY	2026-06-11 05:30:49.765	2026-06-11 05:31:08.709	18	1
100	ACTIVE	2026-06-11 05:31:08.709	2026-06-11 05:31:13.805	5	1
101	AWAY	2026-06-11 05:31:13.805	2026-06-11 05:31:41.594	27	1
102	ACTIVE	2026-06-11 05:31:41.594	2026-06-11 05:33:44.367	122	1
103	OFFLINE	2026-06-11 05:33:44.367	2026-06-11 05:33:45.086	0	1
123	OFFLINE	2026-06-11 05:57:23.063	2026-06-11 05:57:45.606	22	1
104	AWAY	2026-06-11 05:33:45.086	2026-06-11 05:33:46.661	1	1
105	ACTIVE	2026-06-11 05:33:46.568	\N	0	1
106	ACTIVE	2026-06-11 05:33:46.661	2026-06-11 05:33:51.415	4	1
107	AWAY	2026-06-11 05:33:51.415	2026-06-11 05:33:55.35	3	1
108	ACTIVE	2026-06-11 05:33:55.35	2026-06-11 05:35:41.268	105	1
109	AWAY	2026-06-11 05:35:41.268	2026-06-11 05:35:47.32	6	1
110	ACTIVE	2026-06-11 05:35:47.32	2026-06-11 05:35:52.664	5	1
111	AWAY	2026-06-11 05:35:52.664	2026-06-11 05:36:23.859	31	1
113	AWAY	2026-06-11 05:41:25.242	2026-06-11 05:44:50.681	205	1
115	ACTIVE	2026-06-11 05:44:50.681	2026-06-11 05:54:53.082	602	1
114	ACTIVE	2026-06-11 05:44:50.646	2026-06-11 05:54:53.13	602	1
117	OFFLINE	2026-06-11 05:54:53.13	2026-06-11 05:56:28.446	95	1
118	ACTIVE	2026-06-11 05:56:28.446	2026-06-11 05:56:28.496	0	1
119	ACTIVE	2026-06-11 05:56:28.496	2026-06-11 05:56:33.647	5	1
120	AWAY	2026-06-11 05:56:33.647	2026-06-11 05:56:35.681	2	1
121	ACTIVE	2026-06-11 05:56:35.681	2026-06-11 05:57:23.014	47	1
122	AWAY	2026-06-11 05:57:23.014	2026-06-11 05:57:23.063	0	1
124	ACTIVE	2026-06-11 05:57:45.606	2026-06-11 05:57:50.872	5	1
125	AWAY	2026-06-11 05:57:50.872	2026-06-11 05:57:51.242	0	1
126	ACTIVE	2026-06-11 05:57:51.242	2026-06-11 06:01:14.032	202	1
127	AWAY	2026-06-11 06:01:14.032	2026-06-11 06:01:39.789	25	1
128	ACTIVE	2026-06-11 06:01:39.789	2026-06-11 06:01:41.37	1	1
129	AWAY	2026-06-11 06:01:41.37	2026-06-11 06:03:56.596	135	1
130	ACTIVE	2026-06-11 06:03:56.596	2026-06-11 06:04:32.985	36	1
131	AWAY	2026-06-11 06:04:32.985	2026-06-11 06:08:10.346	217	1
132	ACTIVE	2026-06-11 06:08:10.346	2026-06-11 06:15:01.503	411	1
133	OFFLINE	2026-06-11 06:15:01.503	2026-06-11 06:18:04.882	183	1
134	ACTIVE	2026-06-11 06:18:04.882	2026-06-11 06:18:45.292	40	1
135	AWAY	2026-06-11 06:18:45.292	2026-06-11 06:18:50.254	4	1
136	OFFLINE	2026-06-11 06:18:50.254	2026-06-11 06:26:00.545	430	1
137	ACTIVE	2026-06-11 06:26:00.545	2026-06-11 06:26:05.751	5	1
138	AWAY	2026-06-11 06:26:05.751	2026-06-11 06:26:10.461	4	1
139	OFFLINE	2026-06-11 06:26:10.461	2026-06-11 06:26:28.092	17	1
140	ACTIVE	2026-06-11 06:26:28.092	2026-06-11 06:26:28.179	0	1
141	AWAY	2026-06-11 06:26:28.179	2026-06-11 06:26:31.827	3	1
116	AWAY	2026-06-11 05:54:53.082	2026-06-11 06:45:19.386	3026	1
142	OFFLINE	2026-06-11 06:26:31.827	2026-06-11 06:42:16.78	944	1
143	ACTIVE	2026-06-11 06:42:16.78	2026-06-11 06:42:22.006	5	1
144	AWAY	2026-06-11 06:42:22.006	2026-06-11 06:42:25.359	3	1
145	ACTIVE	2026-06-11 06:42:25.359	2026-06-11 06:42:36.007	10	1
146	AWAY	2026-06-11 06:42:36.007	2026-06-11 06:42:55.424	19	1
147	OFFLINE	2026-06-11 06:42:55.424	2026-06-11 06:45:19.364	143	1
148	ACTIVE	2026-06-11 06:45:19.364	2026-06-11 06:45:19.411	0	1
150	ACTIVE	2026-06-11 06:45:19.411	2026-06-11 06:45:22.085	2	1
151	AWAY	2026-06-11 06:45:22.085	2026-06-11 06:45:25.999	3	1
152	OFFLINE	2026-06-11 06:45:25.999	2026-06-11 06:45:57.165	31	1
153	ACTIVE	2026-06-11 06:45:57.165	2026-06-11 06:46:10.348	13	1
154	AWAY	2026-06-11 06:46:10.348	2026-06-11 06:46:14.226	3	1
155	OFFLINE	2026-06-11 06:46:14.226	2026-06-11 07:07:07.668	1253	1
156	ACTIVE	2026-06-11 07:07:07.668	2026-06-11 07:09:11.093	123	1
157	AWAY	2026-06-11 07:09:11.093	2026-06-11 07:09:30.995	19	1
158	OFFLINE	2026-06-11 07:09:30.995	2026-06-11 07:13:31.267	240	1
159	ACTIVE	2026-06-11 07:13:31.267	2026-06-11 07:14:21.665	50	1
160	AWAY	2026-06-11 07:14:21.665	2026-06-11 07:18:16.778	235	1
161	ACTIVE	2026-06-11 07:18:16.778	2026-06-11 07:20:16.381	119	1
162	AWAY	2026-06-11 07:20:16.381	2026-06-11 07:20:30.985	14	1
163	ACTIVE	2026-06-11 07:20:30.985	2026-06-11 07:21:47.045	76	1
164	AWAY	2026-06-11 07:21:47.045	2026-06-11 07:22:16.387	29	1
149	ACTIVE	2026-06-11 06:45:19.386	2026-06-11 07:22:16.417	2217	1
165	ACTIVE	2026-06-11 07:22:16.387	2026-06-11 07:22:16.427	0	1
167	ACTIVE	2026-06-11 07:22:16.427	2026-06-11 07:23:00.952	44	1
168	AWAY	2026-06-11 07:23:00.952	2026-06-11 07:23:23.705	22	1
169	ACTIVE	2026-06-11 07:23:23.705	2026-06-11 07:23:35.24	11	1
170	AWAY	2026-06-11 07:23:35.24	2026-06-11 07:23:41.77	6	1
171	ACTIVE	2026-06-11 07:23:41.77	2026-06-11 07:23:43.455	1	1
172	AWAY	2026-06-11 07:23:43.455	2026-06-11 07:25:24.781	101	1
173	ACTIVE	2026-06-11 07:25:24.781	2026-06-11 07:29:14.381	229	1
174	AWAY	2026-06-11 07:29:14.381	2026-06-11 07:29:42.381	28	1
175	ACTIVE	2026-06-11 07:29:42.381	2026-06-11 07:29:45.253	2	1
176	AWAY	2026-06-11 07:29:45.253	\N	0	1
166	ACTIVE	2026-06-11 07:22:16.417	2026-06-11 07:29:45.274	448	1
177	OFFLINE	2026-06-11 07:29:45.274	2026-06-11 07:29:45.525	0	1
178	ACTIVE	2026-06-11 07:29:45.525	2026-06-11 07:29:50.604	5	1
179	AWAY	2026-06-11 07:29:50.604	2026-06-11 07:30:25.48	34	1
180	ACTIVE	2026-06-11 07:30:25.48	2026-06-11 07:32:18.418	112	1
202	ACTIVE	2026-06-11 07:58:41.079	2026-06-11 07:58:44.24	3	1
182	ACTIVE	2026-06-11 07:32:23.086	\N	0	1
181	AWAY	2026-06-11 07:32:18.418	2026-06-11 07:32:23.103	4	1
183	ACTIVE	2026-06-11 07:32:23.103	2026-06-11 07:32:24.5	1	1
184	AWAY	2026-06-11 07:32:24.5	2026-06-11 07:43:29.024	664	1
185	ACTIVE	2026-06-11 07:43:29.024	2026-06-11 07:43:29.095	0	1
186	ACTIVE	2026-06-11 07:43:29.095	2026-06-11 07:43:36.843	7	1
187	AWAY	2026-06-11 07:43:36.843	2026-06-11 07:43:42.994	6	1
188	ACTIVE	2026-06-11 07:43:42.994	2026-06-11 07:46:49.949	186	1
189	OFFLINE	2026-06-11 07:46:49.949	2026-06-11 07:46:50.989	1	1
190	ACTIVE	2026-06-11 07:46:50.989	2026-06-11 07:50:05.256	194	1
191	AWAY	2026-06-11 07:50:05.256	2026-06-11 07:50:08.367	3	1
192	ACTIVE	2026-06-11 07:50:08.365	\N	0	1
193	ACTIVE	2026-06-11 07:50:08.367	2026-06-11 07:53:12.182	183	1
203	AWAY	2026-06-11 07:58:44.24	2026-06-11 07:58:54.204	9	1
194	AWAY	2026-06-11 07:53:12.182	2026-06-11 07:54:50.022	97	1
196	ACTIVE	2026-06-11 07:54:50.022	2026-06-11 07:55:19.885	29	1
197	AWAY	2026-06-11 07:55:19.885	2026-06-11 07:55:47.489	27	1
198	ACTIVE	2026-06-11 07:55:47.489	2026-06-11 07:58:28.976	161	1
199	AWAY	2026-06-11 07:58:28.976	2026-06-11 07:58:41.013	12	1
200	ACTIVE	2026-06-11 07:58:41.013	\N	0	1
195	ACTIVE	2026-06-11 07:54:50.01	2026-06-11 07:58:41.079	231	1
204	ACTIVE	2026-06-11 07:58:54.204	2026-06-11 07:58:54.236	0	1
205	ACTIVE	2026-06-11 07:58:54.236	2026-06-11 07:58:59.735	5	1
206	AWAY	2026-06-11 07:58:59.735	2026-06-11 07:59:46.258	46	1
207	ACTIVE	2026-06-11 07:59:46.258	\N	0	1
227	OFFLINE	2026-06-11 13:50:49.587	2026-06-11 14:11:00.541	1210	1
201	ACTIVE	2026-06-11 07:58:41.078	2026-06-11 07:59:46.287	65	1
208	ACTIVE	2026-06-11 07:59:46.28	\N	0	1
209	ACTIVE	2026-06-11 07:59:46.287	2026-06-11 07:59:49.329	3	1
210	AWAY	2026-06-11 07:59:49.329	2026-06-11 08:02:33.3	163	1
211	ACTIVE	2026-06-11 08:02:33.3	2026-06-11 08:02:33.991	0	1
212	AWAY	2026-06-11 08:02:33.991	2026-06-11 09:49:26.207	6412	1
213	ACTIVE	2026-06-11 09:49:26.207	2026-06-11 09:49:31.295	5	1
214	AWAY	2026-06-11 09:49:31.295	2026-06-11 09:49:37.779	6	1
215	ACTIVE	2026-06-11 09:49:37.779	2026-06-11 10:29:23.57	2385	1
216	OFFLINE	2026-06-11 10:29:23.57	2026-06-11 11:02:16.742	1973	1
217	ACTIVE	2026-06-11 11:02:16.742	2026-06-11 11:02:21.896	5	1
218	AWAY	2026-06-11 11:02:21.896	2026-06-11 11:02:22.343	0	1
219	ACTIVE	2026-06-11 11:02:22.343	2026-06-11 11:03:10.597	48	1
220	AWAY	2026-06-11 11:03:10.597	2026-06-11 13:26:49.734	8619	1
221	OFFLINE	2026-06-11 13:26:49.734	2026-06-11 13:26:51.675	1	1
222	ACTIVE	2026-06-11 13:26:51.675	2026-06-11 13:42:53.477	961	1
223	AWAY	2026-06-11 13:42:53.477	2026-06-11 13:48:10.051	316	1
224	ACTIVE	2026-06-11 13:48:10.051	2026-06-11 13:48:10.277	0	1
225	ACTIVE	2026-06-11 13:48:10.277	2026-06-11 13:49:15.1	64	1
226	AWAY	2026-06-11 13:49:15.1	2026-06-11 13:50:49.587	94	1
228	ACTIVE	2026-06-11 14:11:00.541	2026-06-11 14:27:10.465	969	1
229	AWAY	2026-06-11 14:27:10.465	2026-06-11 14:54:15.513	1625	1
230	ACTIVE	2026-06-11 14:54:15.513	2026-06-11 14:59:20.448	304	1
231	AWAY	2026-06-11 14:59:20.448	2026-06-11 15:14:31.41	910	1
232	ACTIVE	2026-06-11 15:14:31.41	2026-06-11 15:20:25.27	353	1
233	AWAY	2026-06-11 15:20:25.27	2026-06-11 15:49:06.886	1721	1
234	ACTIVE	2026-06-11 15:49:06.886	2026-06-11 15:49:12.589	5	1
235	AWAY	2026-06-11 15:49:12.589	2026-06-11 15:49:37.551	24	1
236	ACTIVE	2026-06-11 15:49:37.551	2026-06-11 15:58:50.889	553	1
242	ACTIVE	2026-06-11 15:59:13.385	2026-06-11 15:59:19.451	6	1
237	AWAY	2026-06-11 15:58:50.889	2026-06-11 15:58:52.013	1	1
238	ACTIVE	2026-06-11 15:58:51.985	\N	0	1
239	ACTIVE	2026-06-11 15:58:52.013	2026-06-11 15:58:57.664	5	1
240	OFFLINE	2026-06-11 15:58:57.664	2026-06-11 15:59:13.385	15	1
243	AWAY	2026-06-11 15:59:19.451	2026-06-11 15:59:31.272	11	1
244	ACTIVE	2026-06-11 15:59:31.272	2026-06-11 16:08:13.272	522	1
245	AWAY	2026-06-11 16:08:13.272	2026-06-11 16:13:08.281	295	1
246	ACTIVE	2026-06-11 16:13:08.281	2026-06-11 16:38:43.263	1534	1
247	AWAY	2026-06-11 16:38:43.263	2026-06-11 16:55:13.381	990	1
248	ACTIVE	2026-06-11 16:55:13.381	2026-06-11 16:59:33.949	260	1
249	AWAY	2026-06-11 16:59:33.949	2026-06-11 17:06:03.916	389	1
250	ACTIVE	2026-06-11 17:06:03.916	2026-06-11 17:06:41.232	37	1
251	OFFLINE	2026-06-11 17:06:41.232	2026-06-11 17:06:56.224	14	1
252	ACTIVE	2026-06-11 17:06:56.224	2026-06-11 17:12:11.205	314	1
253	AWAY	2026-06-11 17:12:11.205	2026-06-11 17:14:21.212	130	1
254	ACTIVE	2026-06-11 17:14:21.212	2026-06-11 17:19:06.334	285	1
255	AWAY	2026-06-11 17:19:06.334	2026-06-11 17:25:09.777	363	1
256	ACTIVE	2026-06-11 17:25:09.777	2026-06-11 17:25:15.123	5	1
257	AWAY	2026-06-11 17:25:15.123	2026-06-11 17:25:20.127	5	1
258	ACTIVE	2026-06-11 17:25:20.127	2026-06-11 17:25:33.202	13	1
259	AWAY	2026-06-11 17:25:33.202	2026-06-11 17:25:47.823	14	1
260	ACTIVE	2026-06-11 17:25:47.823	2026-06-11 17:25:47.912	0	1
261	AWAY	2026-06-11 17:25:47.912	2026-06-11 17:25:55.152	7	1
262	ACTIVE	2026-06-11 17:25:55.152	\N	0	1
241	ACTIVE	2026-06-11 15:59:13.382	2026-06-11 17:25:55.221	5201	1
263	ACTIVE	2026-06-11 17:25:55.219	\N	0	1
264	ACTIVE	2026-06-11 17:25:55.221	2026-06-11 17:25:57.18	1	1
265	AWAY	2026-06-11 17:25:57.18	2026-06-11 17:26:46.361	49	1
266	ACTIVE	2026-06-11 17:26:46.361	2026-06-11 17:26:46.436	0	1
267	AWAY	2026-06-11 17:26:46.436	2026-06-11 17:27:26.918	40	1
268	ACTIVE	2026-06-11 17:27:26.918	2026-06-11 17:27:28.954	2	1
320	ACTIVE	2026-06-11 21:36:01.27	2026-06-11 21:51:41.19	939	1
269	AWAY	2026-06-11 17:27:28.954	2026-06-11 17:27:33.509	4	1
270	ACTIVE	2026-06-11 17:27:33.506	\N	0	1
271	ACTIVE	2026-06-11 17:27:33.509	2026-06-11 17:27:41.792	8	1
321	AWAY	2026-06-11 21:51:41.19	2026-06-11 21:52:21.204	40	1
272	AWAY	2026-06-11 17:27:41.792	2026-06-11 17:27:55.726	13	1
273	ACTIVE	2026-06-11 17:27:55.695	\N	0	1
274	ACTIVE	2026-06-11 17:27:55.72	\N	0	1
275	ACTIVE	2026-06-11 17:27:55.726	2026-06-11 17:28:02.008	6	1
276	AWAY	2026-06-11 17:28:02.008	2026-06-11 17:29:10.63	68	1
277	ACTIVE	2026-06-11 17:29:10.592	\N	0	1
278	ACTIVE	2026-06-11 17:29:10.63	2026-06-11 17:36:46.198	455	1
279	AWAY	2026-06-11 17:36:46.198	2026-06-11 17:57:36.264	1250	1
280	ACTIVE	2026-06-11 17:57:36.264	2026-06-11 18:02:14.017	277	1
281	AWAY	2026-06-11 18:02:14.017	2026-06-11 18:09:00.909	406	1
282	ACTIVE	2026-06-11 18:09:00.909	2026-06-11 18:14:06.198	305	1
283	AWAY	2026-06-11 18:14:06.198	2026-06-11 18:33:26.28	1160	1
284	ACTIVE	2026-06-11 18:33:26.28	2026-06-11 18:36:46.875	200	1
285	AWAY	2026-06-11 18:36:46.875	2026-06-11 18:37:29.356	42	1
286	ACTIVE	2026-06-11 18:37:29.356	2026-06-11 18:37:29.448	0	1
287	AWAY	2026-06-11 18:37:29.448	2026-06-11 18:38:09.372	39	1
288	ACTIVE	2026-06-11 18:38:09.372	2026-06-11 18:38:31.212	21	1
289	AWAY	2026-06-11 18:38:31.212	2026-06-11 18:38:50.611	19	1
290	ACTIVE	2026-06-11 18:38:50.611	2026-06-11 18:40:54.949	124	1
291	AWAY	2026-06-11 18:40:54.949	2026-06-11 18:40:56.256	1	1
292	ACTIVE	2026-06-11 18:40:56.256	2026-06-11 18:46:15.03	318	1
322	ACTIVE	2026-06-11 21:52:21.204	2026-06-11 21:59:01.184	399	1
293	AWAY	2026-06-11 18:46:15.03	2026-06-11 18:49:51.382	216	1
294	ACTIVE	2026-06-11 18:49:51.375	\N	0	1
295	ACTIVE	2026-06-11 18:49:51.382	2026-06-11 18:50:38.122	46	1
296	AWAY	2026-06-11 18:50:38.122	2026-06-11 18:56:04.352	326	1
297	ACTIVE	2026-06-11 18:56:04.352	2026-06-11 18:56:09.422	5	1
298	AWAY	2026-06-11 18:56:09.422	2026-06-11 18:56:25.329	15	1
299	ACTIVE	2026-06-11 18:56:25.329	2026-06-11 18:56:36.458	11	1
300	AWAY	2026-06-11 18:56:36.458	2026-06-11 18:58:01.261	84	1
301	ACTIVE	2026-06-11 18:58:01.246	\N	0	1
302	ACTIVE	2026-06-11 18:58:01.261	2026-06-11 19:03:06.186	304	1
303	AWAY	2026-06-11 19:03:06.186	2026-06-11 19:18:21.284	915	1
304	ACTIVE	2026-06-11 19:18:21.284	2026-06-11 19:23:19.084	297	1
305	AWAY	2026-06-11 19:23:19.084	2026-06-11 19:39:33.538	974	1
306	ACTIVE	2026-06-11 19:39:33.538	2026-06-11 19:44:41.214	307	1
307	AWAY	2026-06-11 19:44:41.214	2026-06-11 19:45:56.237	75	1
308	ACTIVE	2026-06-11 19:45:56.237	2026-06-11 19:57:51.201	714	1
309	AWAY	2026-06-11 19:57:51.201	2026-06-11 20:02:26.235	275	1
310	ACTIVE	2026-06-11 20:02:26.235	2026-06-11 20:55:11.202	3164	1
311	AWAY	2026-06-11 20:55:11.202	2026-06-11 20:55:51.209	40	1
312	ACTIVE	2026-06-11 20:55:51.209	2026-06-11 21:02:21.194	389	1
313	AWAY	2026-06-11 21:02:21.194	2026-06-11 21:03:36.195	75	1
314	ACTIVE	2026-06-11 21:03:36.195	2026-06-11 21:10:01.192	384	1
315	AWAY	2026-06-11 21:10:01.192	2026-06-11 21:17:16.252	435	1
316	ACTIVE	2026-06-11 21:17:16.252	2026-06-11 21:23:26.213	369	1
317	AWAY	2026-06-11 21:23:26.213	2026-06-11 21:25:26.246	120	1
318	ACTIVE	2026-06-11 21:25:26.246	2026-06-11 21:30:26.198	299	1
319	AWAY	2026-06-11 21:30:26.198	2026-06-11 21:36:01.27	335	1
323	AWAY	2026-06-11 21:59:01.184	2026-06-11 22:11:26.299	745	1
324	ACTIVE	2026-06-11 22:11:26.299	2026-06-11 22:19:14.2	467	1
345	ACTIVE	2026-06-11 22:48:54.516	2026-06-11 22:50:49.913	115	1
325	AWAY	2026-06-11 22:19:14.2	2026-06-11 22:19:22.971	8	1
327	ACTIVE	2026-06-11 22:19:22.971	\N	0	1
326	ACTIVE	2026-06-11 22:19:22.974	2026-06-11 22:19:24.103	1	1
328	AWAY	2026-06-11 22:19:24.103	2026-06-11 22:33:06.235	822	1
329	ACTIVE	2026-06-11 22:33:06.235	2026-06-11 22:39:07.262	361	1
330	AWAY	2026-06-11 22:39:07.262	2026-06-11 22:45:12.114	364	1
331	ACTIVE	2026-06-11 22:45:12.114	2026-06-11 22:45:17.252	5	1
333	ACTIVE	2026-06-11 22:45:35.277	\N	0	1
332	AWAY	2026-06-11 22:45:17.252	2026-06-11 22:45:35.293	18	1
334	ACTIVE	2026-06-11 22:45:35.293	2026-06-11 22:45:54.106	18	1
335	AWAY	2026-06-11 22:45:54.106	2026-06-11 22:45:57.96	3	1
336	ACTIVE	2026-06-11 22:45:57.96	2026-06-11 22:46:02.577	4	1
337	AWAY	2026-06-11 22:46:02.577	2026-06-11 22:46:19.555	16	1
338	ACTIVE	2026-06-11 22:46:19.555	2026-06-11 22:46:24.198	4	1
339	AWAY	2026-06-11 22:46:24.198	2026-06-11 22:47:26.216	62	1
340	ACTIVE	2026-06-11 22:47:26.216	2026-06-11 22:48:00.61	34	1
362	ACTIVE	2026-06-11 23:03:19.523	2026-06-11 23:03:21.547	2	1
341	AWAY	2026-06-11 22:48:00.61	2026-06-11 22:48:00.653	0	1
342	ACTIVE	2026-06-11 22:48:00.651	\N	0	1
343	ACTIVE	2026-06-11 22:48:00.653	2026-06-11 22:48:36.938	36	1
344	AWAY	2026-06-11 22:48:36.938	2026-06-11 22:48:54.516	17	1
346	AWAY	2026-06-11 22:50:49.913	2026-06-11 22:50:51.694	1	1
347	ACTIVE	2026-06-11 22:50:51.68	\N	0	1
348	ACTIVE	2026-06-11 22:50:51.694	2026-06-11 22:50:53.687	1	1
349	AWAY	2026-06-11 22:50:53.687	2026-06-11 22:50:56.941	3	1
350	ACTIVE	2026-06-11 22:50:56.941	2026-06-11 22:51:01.492	4	1
351	AWAY	2026-06-11 22:51:01.492	2026-06-11 22:58:11.591	430	1
352	ACTIVE	2026-06-11 22:58:11.591	2026-06-11 22:58:12.827	1	1
353	AWAY	2026-06-11 22:58:12.827	2026-06-11 22:58:15.292	2	1
354	ACTIVE	2026-06-11 22:58:15.292	2026-06-11 22:58:18.389	3	1
355	AWAY	2026-06-11 22:58:18.389	2026-06-11 22:58:21.086	2	1
356	ACTIVE	2026-06-11 22:58:21.086	2026-06-11 22:58:24.904	3	1
357	AWAY	2026-06-11 22:58:24.904	2026-06-11 23:02:40.276	255	1
358	ACTIVE	2026-06-11 23:02:40.248	\N	0	1
359	ACTIVE	2026-06-11 23:02:40.276	2026-06-11 23:02:51.778	11	1
360	AWAY	2026-06-11 23:02:51.778	2026-06-11 23:03:19.523	27	1
361	ACTIVE	2026-06-11 23:03:19.514	\N	0	1
363	AWAY	2026-06-11 23:03:21.547	2026-06-11 23:03:23.83	2	1
364	ACTIVE	2026-06-11 23:03:23.83	2026-06-11 23:03:33.609	9	1
365	AWAY	2026-06-11 23:03:33.609	2026-06-11 23:03:46.192	12	1
366	ACTIVE	2026-06-11 23:03:46.192	2026-06-11 23:09:26.214	340	1
367	AWAY	2026-06-11 23:09:26.214	2026-06-11 23:09:56.218	30	1
368	ACTIVE	2026-06-11 23:09:56.218	2026-06-11 23:09:58.77	2	1
369	AWAY	2026-06-11 23:09:58.77	2026-06-11 23:09:59.214	0	1
370	ACTIVE	2026-06-11 23:09:59.214	2026-06-11 23:10:04.431	5	1
371	AWAY	2026-06-11 23:10:04.431	2026-06-11 23:29:43.843	1179	1
372	ACTIVE	2026-06-11 23:29:43.843	2026-06-11 23:31:02.053	78	1
373	AWAY	2026-06-11 23:31:02.053	2026-06-11 23:31:07.987	5	1
374	ACTIVE	2026-06-11 23:31:07.987	2026-06-11 23:31:11.319	3	1
375	AWAY	2026-06-11 23:31:11.319	2026-06-11 23:31:40.273	28	1
376	ACTIVE	2026-06-11 23:31:40.273	2026-06-11 23:31:45.712	5	1
377	AWAY	2026-06-11 23:31:45.712	2026-06-11 23:31:50.572	4	1
378	ACTIVE	2026-06-11 23:31:50.572	2026-06-11 23:32:00.81	10	1
379	AWAY	2026-06-11 23:32:00.81	2026-06-11 23:32:04.097	3	1
380	ACTIVE	2026-06-11 23:32:04.083	\N	0	1
381	ACTIVE	2026-06-11 23:32:04.097	2026-06-11 23:32:06.805	2	1
382	AWAY	2026-06-11 23:32:06.805	2026-06-11 23:32:09.842	3	1
384	ACTIVE	2026-06-11 23:32:09.842	2026-06-11 23:32:13.178	3	1
385	AWAY	2026-06-11 23:32:13.178	2026-06-11 23:32:17.559	4	1
386	ACTIVE	2026-06-11 23:32:17.559	\N	0	1
383	ACTIVE	2026-06-11 23:32:09.841	2026-06-11 23:32:17.568	7	1
389	ACTIVE	2026-06-11 23:32:23.943	\N	0	1
390	ACTIVE	2026-06-11 23:32:23.968	2026-06-11 23:32:58.345	34	1
391	AWAY	2026-06-11 23:32:58.345	2026-06-11 23:33:07.438	9	1
396	ACTIVE	2026-06-11 23:48:09.142	\N	0	1
404	AWAY	2026-06-12 00:24:27.284	2026-06-12 00:24:48.957	21	1
387	ACTIVE	2026-06-11 23:32:17.568	2026-06-11 23:32:20.472	2	1
388	AWAY	2026-06-11 23:32:20.472	2026-06-11 23:32:23.968	3	1
392	ACTIVE	2026-06-11 23:33:07.438	2026-06-11 23:33:08.746	1	1
393	AWAY	2026-06-11 23:33:08.746	2026-06-11 23:38:51.523	342	1
394	ACTIVE	2026-06-11 23:38:51.523	2026-06-11 23:46:17.694	446	1
395	AWAY	2026-06-11 23:46:17.694	2026-06-11 23:48:09.153	111	1
397	ACTIVE	2026-06-11 23:48:09.153	2026-06-11 23:48:47.989	38	1
398	AWAY	2026-06-11 23:48:47.989	2026-06-12 00:05:28.816	1000	1
399	ACTIVE	2026-06-12 00:05:28.816	2026-06-12 00:10:59.06	330	1
400	AWAY	2026-06-12 00:10:59.06	2026-06-12 00:23:57.132	778	1
401	ACTIVE	2026-06-12 00:23:57.132	2026-06-12 00:24:03.785	6	1
402	AWAY	2026-06-12 00:24:03.785	2026-06-12 00:24:23.538	19	1
403	ACTIVE	2026-06-12 00:24:23.538	2026-06-12 00:24:27.284	3	1
405	ACTIVE	2026-06-12 00:24:48.957	2026-06-12 00:24:49.508	0	1
406	AWAY	2026-06-12 00:24:49.508	2026-06-12 00:24:52.73	3	1
407	ACTIVE	2026-06-12 00:24:52.73	2026-06-12 00:26:03.941	71	1
408	AWAY	2026-06-12 00:26:03.941	2026-06-12 00:26:26.614	22	1
409	ACTIVE	2026-06-12 00:26:26.614	2026-06-12 00:26:27.098	0	1
410	AWAY	2026-06-12 00:26:27.098	2026-06-12 00:26:30.024	2	1
411	ACTIVE	2026-06-12 00:26:30.024	2026-06-12 00:26:34.03	4	1
412	AWAY	2026-06-12 00:26:34.03	2026-06-12 00:26:38.689	4	1
413	ACTIVE	2026-06-12 00:26:38.689	2026-06-12 00:26:42.65	3	1
414	AWAY	2026-06-12 00:26:42.65	2026-06-12 00:30:23.655	221	1
415	ACTIVE	2026-06-12 00:30:23.655	2026-06-12 00:30:38.501	14	1
416	AWAY	2026-06-12 00:30:38.501	2026-06-12 00:30:40.66	2	1
417	ACTIVE	2026-06-12 00:30:40.66	2026-06-12 00:30:45.355	4	1
418	AWAY	2026-06-12 00:30:45.355	2026-06-12 00:31:21.549	36	1
419	ACTIVE	2026-06-12 00:31:21.549	2026-06-12 00:31:36.828	15	1
420	AWAY	2026-06-12 00:31:36.828	2026-06-12 00:31:57.051	20	1
421	ACTIVE	2026-06-12 00:31:57.051	2026-06-12 00:31:57.363	0	1
422	AWAY	2026-06-12 00:31:57.351	\N	0	1
423	AWAY	2026-06-12 00:31:57.363	2026-06-12 00:32:53.374	56	1
424	ACTIVE	2026-06-12 00:32:53.374	2026-06-12 01:01:28.415	1715	1
425	AWAY	2026-06-12 01:01:28.415	2026-06-12 01:03:13.422	105	1
426	ACTIVE	2026-06-12 01:03:13.422	2026-06-12 01:03:23.896	10	1
427	AWAY	2026-06-12 01:03:23.896	2026-06-12 02:05:14.566	3710	1
428	ACTIVE	2026-06-12 02:05:14.566	2026-06-12 02:20:15.565	900	1
429	AWAY	2026-06-12 02:20:15.565	\N	0	1
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, name, "placeOfBirth", "dateOfBirth", gender, address, religion, "maritalStatus", "jobTitle", nationality, "joinedAt", email, phone, username, password, pin, rfid, "fingerprintData", "securityMode", status, "isVerified", "baseShift", "socketId", "lastSeen", "assignedTableIds", "currentActivePage", "createdAt", "updatedAt", "roleId") FROM stdin;
1	Super Admin	\N	\N	\N	\N	\N	\N	\N	\N	\N	admin@voc-billiard.com		admin	$2b$10$IVsyc8erpIvKExzUidCsw.NApJkZmu0M2Cg6fWefO.DAiaQoDFoa.	\N	\N		HYBRID	AWAY	t		Tj9-0y4K22s9I7NbAACR	2026-06-12 02:20:15.565	\N	/	2026-06-11 04:37:38.071038	2026-06-12 02:20:15.639065	1
\.


--
-- Data for Name: violations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.violations (id, "userId", type, description, "penaltyAmount", "durationMinutes", "shiftId", "businessDayId", "payrollReleaseId", "createdAt") FROM stdin;
1	1	IDLE_TIMEOUT	Meninggalkan sistem selama 6 menit (termasuk waktu offline pada shift aktif).	10000.00	\N	\N	1	\N	2026-06-11 05:07:22.571617
2	1	IDLE_TIMEOUT	Meninggalkan sistem selama 7 menit (termasuk waktu offline pada shift aktif).	0.00	\N	\N	1	\N	2026-06-11 05:24:23.450028
3	1	IDLE_TIMEOUT	Meninggalkan sistem selama 6 menit (termasuk waktu offline pada shift aktif).	0.00	\N	\N	1	\N	2026-06-11 06:08:10.345313
4	1	IDLE_TIMEOUT	Meninggalkan sistem selama 5 menit (termasuk waktu offline pada shift aktif).	0.00	\N	\N	1	\N	2026-06-11 07:29:42.384817
5	1	IDLE_TIMEOUT	Meninggalkan sistem selama 11 menit (termasuk waktu offline pada shift aktif).	0.00	\N	\N	1	\N	2026-06-11 07:43:29.017068
6	1	IDLE_TIMEOUT	Meninggalkan sistem selama 106 menit (termasuk waktu offline pada shift aktif).	0.00	\N	\N	1	\N	2026-06-11 09:49:26.129869
7	1	IDLE_TIMEOUT	Meninggalkan sistem selama 106 menit (termasuk waktu offline pada shift aktif).	0.00	\N	\N	1	\N	2026-06-11 09:49:26.206297
8	1	IDLE_TIMEOUT	Meninggalkan sistem selama 72 menit (termasuk waktu offline pada shift aktif).	0.00	\N	\N	1	\N	2026-06-11 11:02:16.703785
9	1	IDLE_TIMEOUT	Meninggalkan sistem selama 5 menit (termasuk waktu offline pada shift aktif).	0.00	\N	\N	1	\N	2026-06-11 13:48:09.941861
10	1	IDLE_TIMEOUT	Meninggalkan sistem selama 5 menit (termasuk waktu offline pada shift aktif).	0.00	\N	\N	1	\N	2026-06-11 13:48:10.050868
11	1	IDLE_TIMEOUT	Meninggalkan sistem selama 27 menit (termasuk waktu offline pada shift aktif).	0.00	\N	\N	1	\N	2026-06-11 14:54:15.46122
12	1	IDLE_TIMEOUT	Meninggalkan sistem selama 15 menit (termasuk waktu offline pada shift aktif).	0.00	\N	\N	1	\N	2026-06-11 15:14:31.254064
13	1	IDLE_TIMEOUT	Meninggalkan sistem selama 28 menit (termasuk waktu offline pada shift aktif).	0.00	\N	\N	1	\N	2026-06-11 15:49:06.835097
14	1	IDLE_TIMEOUT	Meninggalkan sistem selama 16 menit (termasuk waktu offline pada shift aktif).	0.00	\N	\N	1	\N	2026-06-11 16:55:13.265172
15	1	IDLE_TIMEOUT	Meninggalkan sistem selama 6 menit (termasuk waktu offline pada shift aktif).	0.00	\N	\N	1	\N	2026-06-11 17:06:03.903403
16	1	IDLE_TIMEOUT	Meninggalkan sistem selama 6 menit (termasuk waktu offline pada shift aktif).	0.00	\N	\N	1	\N	2026-06-11 17:25:09.720112
17	1	IDLE_TIMEOUT	Meninggalkan sistem selama 20 menit (termasuk waktu offline pada shift aktif).	0.00	\N	\N	1	\N	2026-06-11 17:57:36.203097
18	1	IDLE_TIMEOUT	Meninggalkan sistem selama 6 menit (termasuk waktu offline pada shift aktif).	0.00	\N	\N	1	\N	2026-06-11 18:09:00.906591
19	1	IDLE_TIMEOUT	Meninggalkan sistem selama 19 menit (termasuk waktu offline pada shift aktif).	0.00	\N	\N	1	\N	2026-06-11 18:33:26.195303
20	1	IDLE_TIMEOUT	Meninggalkan sistem selama 5 menit (termasuk waktu offline pada shift aktif).	0.00	\N	\N	1	\N	2026-06-11 18:56:04.302157
21	1	IDLE_TIMEOUT	Meninggalkan sistem selama 15 menit (termasuk waktu offline pada shift aktif).	0.00	\N	\N	1	\N	2026-06-11 19:18:21.241344
22	1	IDLE_TIMEOUT	Meninggalkan sistem selama 16 menit (termasuk waktu offline pada shift aktif).	0.00	\N	\N	1	\N	2026-06-11 19:39:33.536899
23	1	IDLE_TIMEOUT	Meninggalkan sistem selama 7 menit (termasuk waktu offline pada shift aktif).	0.00	\N	\N	1	\N	2026-06-11 21:17:16.195155
24	1	IDLE_TIMEOUT	Meninggalkan sistem selama 5 menit (termasuk waktu offline pada shift aktif).	0.00	\N	\N	1	\N	2026-06-11 21:36:01.18573
25	1	IDLE_TIMEOUT	Meninggalkan sistem selama 12 menit (termasuk waktu offline pada shift aktif).	0.00	\N	\N	1	\N	2026-06-11 22:11:26.213781
26	1	IDLE_TIMEOUT	Meninggalkan sistem selama 13 menit (termasuk waktu offline pada shift aktif).	0.00	\N	\N	1	\N	2026-06-11 22:33:06.187109
27	1	IDLE_TIMEOUT	Meninggalkan sistem selama 6 menit (termasuk waktu offline pada shift aktif).	0.00	\N	\N	1	\N	2026-06-11 22:45:12.11603
28	1	IDLE_TIMEOUT	Meninggalkan sistem selama 7 menit (termasuk waktu offline pada shift aktif).	0.00	\N	\N	1	\N	2026-06-11 22:58:11.58985
29	1	IDLE_TIMEOUT	Meninggalkan sistem selama 19 menit (termasuk waktu offline pada shift aktif).	0.00	\N	\N	1	\N	2026-06-11 23:29:43.826093
30	1	IDLE_TIMEOUT	Meninggalkan sistem selama 5 menit (termasuk waktu offline pada shift aktif).	0.00	\N	\N	1	\N	2026-06-11 23:38:51.533391
31	1	IDLE_TIMEOUT	Meninggalkan sistem selama 16 menit (termasuk waktu offline pada shift aktif).	0.00	\N	\N	1	\N	2026-06-12 00:05:28.752811
32	1	IDLE_TIMEOUT	Meninggalkan sistem selama 12 menit (termasuk waktu offline pada shift aktif).	0.00	\N	\N	1	\N	2026-06-12 00:23:57.09099
33	1	IDLE_TIMEOUT	Meninggalkan sistem selama 61 menit (termasuk waktu offline pada shift aktif).	0.00	\N	\N	1	\N	2026-06-12 02:05:14.520439
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

SELECT pg_catalog.setval('public.approval_history_id_seq', 1, false);


--
-- Name: approval_requests_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.approval_requests_id_seq', 1, false);


--
-- Name: asset_categories_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.asset_categories_id_seq', 4, true);


--
-- Name: attendances_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.attendances_id_seq', 1, false);


--
-- Name: audit_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.audit_logs_id_seq', 11, true);


--
-- Name: battle_plan_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.battle_plan_items_id_seq', 2, true);


--
-- Name: battle_plans_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.battle_plans_id_seq', 1, true);


--
-- Name: billiard_packages_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.billiard_packages_id_seq', 14, true);


--
-- Name: business_closures_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.business_closures_id_seq', 1, false);


--
-- Name: business_days_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.business_days_id_seq', 33, true);


--
-- Name: cafe_tables_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.cafe_tables_id_seq', 1, false);


--
-- Name: cashflow_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.cashflow_id_seq', 1, true);


--
-- Name: categories_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.categories_id_seq', 1, false);


--
-- Name: chat_messages_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.chat_messages_id_seq', 1, false);


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

SELECT pg_catalog.setval('public.ingredients_id_seq', 1, false);


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

SELECT pg_catalog.setval('public.menu_items_id_seq', 1, false);


--
-- Name: missions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.missions_id_seq', 33, true);


--
-- Name: order_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.order_items_id_seq', 1, false);


--
-- Name: payroll_configs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.payroll_configs_id_seq', 33, true);


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

SELECT pg_catalog.setval('public.product_finances_id_seq', 1, false);


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

SELECT pg_catalog.setval('public.recipes_id_seq', 1, false);


--
-- Name: roles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.roles_id_seq', 34, true);


--
-- Name: sessions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.sessions_id_seq', 1, false);


--
-- Name: settings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.settings_id_seq', 33, true);


--
-- Name: shift_stock_reports_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.shift_stock_reports_id_seq', 1, false);


--
-- Name: shifts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.shifts_id_seq', 1, false);


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

SELECT pg_catalog.setval('public.tables_id_seq', 13, true);


--
-- Name: transaction_payments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.transaction_payments_id_seq', 1, false);


--
-- Name: transactions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.transactions_id_seq', 1, false);


--
-- Name: user_status_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.user_status_logs_id_seq', 429, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 33, true);


--
-- Name: violations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.violations_id_seq', 33, true);


--
-- Name: vouchers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.vouchers_id_seq', 1, false);


--
-- Name: waiting_lists_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.waiting_lists_id_seq', 1, false);


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

\unrestrict EOuPyyrgRxUPBrgMn4Z4sWrXBdsLUl7ajBtbjfGMteYSrW7Ihxo6yReybZyGYmp

