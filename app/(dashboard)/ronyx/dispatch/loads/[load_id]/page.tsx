"use client";

import LoadDetailPage from "@/app/dispatch/loads/[load_id]/page";

export default function RonyxDispatchLoadDetailPage(
  props: React.ComponentProps<typeof LoadDetailPage>,
) {
  return (
    <LoadDetailPage /* @next-codemod-ignore — LoadDetailPage already calls React.use(props.params) internally */
    {...props} />
  );
}
