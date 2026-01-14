-- Migration 064: Allow matching exceptions in exception_queue

alter table public.exception_queue
  drop constraint if exists exception_queue_entity_type_check;

alter table public.exception_queue
  add constraint exception_queue_entity_type_check
  check (entity_type in ('ticket', 'load', 'document', 'matching'));
