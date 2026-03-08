
ALTER TABLE public.computer_priorities
  ADD COLUMN status text NOT NULL DEFAULT 'aberta',
  ADD COLUMN data_encerramento timestamp with time zone;
