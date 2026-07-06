CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trip_analytics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"period_type" text NOT NULL,
	"period_start" timestamp NOT NULL,
	"period_end" timestamp NOT NULL,
	"total_distance_km" double precision NOT NULL,
	"total_driving_time_ms" integer NOT NULL,
	"total_stop_time_ms" integer NOT NULL,
	"average_trip_speed_kmh" double precision NOT NULL,
	"number_of_trips" integer NOT NULL,
	"computed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trips" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"start_timestamp" timestamp NOT NULL,
	"end_timestamp" timestamp NOT NULL,
	"total_distance_km" double precision NOT NULL,
	"driving_time_ms" integer NOT NULL,
	"stop_time_ms" integer NOT NULL,
	"average_speed_kmh" double precision NOT NULL,
	"max_speed_kmh" double precision NOT NULL,
	"max_speed_timestamp" timestamp,
	"max_speed_lat" double precision,
	"max_speed_lng" double precision,
	"start_location_name" text,
	"end_location_name" text,
	"start_lat" double precision NOT NULL,
	"start_lng" double precision NOT NULL,
	"end_lat" double precision NOT NULL,
	"end_lng" double precision NOT NULL,
	"gps_trace" json NOT NULL,
	"stop_events" json NOT NULL,
	"number_of_stops" integer NOT NULL,
	"synced_at" timestamp DEFAULT now() NOT NULL,
	"client_updated_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"display_name" text NOT NULL,
	"password_hash" text,
	"google_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_google_id_unique" UNIQUE("google_id")
);
--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_analytics" ADD CONSTRAINT "trip_analytics_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trips" ADD CONSTRAINT "trips_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "analytics_user_period_idx" ON "trip_analytics" USING btree ("user_id","period_type","period_start");--> statement-breakpoint
CREATE INDEX "trips_user_id_idx" ON "trips" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "trips_start_timestamp_idx" ON "trips" USING btree ("start_timestamp");--> statement-breakpoint
CREATE INDEX "trips_user_start_idx" ON "trips" USING btree ("user_id","start_timestamp");