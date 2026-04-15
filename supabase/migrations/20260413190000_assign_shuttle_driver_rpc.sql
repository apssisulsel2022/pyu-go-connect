
-- RPC to safely assign a driver to a shuttle schedule (atomic)
-- Updated: 2026-04-15 - Added vehicle type validation
CREATE OR REPLACE FUNCTION public.assign_driver_to_shuttle(
  p_schedule_id UUID,
  p_driver_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_driver UUID;
  v_is_verified BOOLEAN;
  v_required_vehicle_type TEXT;
  v_driver_vehicle_type TEXT;
BEGIN
  -- 1. Check if driver is verified
  SELECT is_verified INTO v_is_verified
  FROM public.drivers
  WHERE id = p_driver_id;

  IF NOT v_is_verified THEN
    RAISE EXCEPTION 'Driver must be verified to take shuttle trips';
  END IF;

  -- 2. Get required vehicle type from schedule
  SELECT vehicle_type INTO v_required_vehicle_type
  FROM public.shuttle_schedules
  WHERE id = p_schedule_id;

  -- 3. Get driver's active vehicle type
  -- Note: Assuming the driver has at least one verified vehicle
  SELECT vehicle_type INTO v_driver_vehicle_type
  FROM public.vehicles
  WHERE driver_id = p_driver_id AND is_verified = true
  LIMIT 1;

  IF v_driver_vehicle_type IS NULL THEN
    RAISE EXCEPTION 'Driver does not have a verified vehicle';
  END IF;

  -- 4. Validate vehicle type match (Case-insensitive)
  -- If schedule doesn't specify a type, any driver can take it
  IF v_required_vehicle_type IS NOT NULL AND LOWER(v_required_vehicle_type) != LOWER(v_driver_vehicle_type) THEN
    RAISE EXCEPTION 'Vehicle type mismatch: Schedule requires %, but your vehicle is %', v_required_vehicle_type, v_driver_vehicle_type;
  END IF;

  -- 5. Lock the row for update to prevent race conditions
  SELECT driver_id INTO v_current_driver
  FROM public.shuttle_schedules
  WHERE id = p_schedule_id
  FOR UPDATE;

  -- 6. Check if the schedule exists and doesn't have a driver yet
  IF v_current_driver IS NULL THEN
    UPDATE public.shuttle_schedules
    SET driver_id = p_driver_id
    WHERE id = p_schedule_id;
    RETURN TRUE;
  ELSE
    RETURN FALSE;
  END IF;
END;
$$;
