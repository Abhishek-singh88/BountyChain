import BountyChainApp from "@/components/bountychain-app";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function BountyDetailsPage({ params }: PageProps) {
  const { id } = await params;

  return <BountyChainApp bountyId={id} focus="detail" />;
}
