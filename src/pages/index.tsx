import type { NextPage } from "next";

import Head from "next/head";
import Layout from "~/components/Layout";
import Feed from "~/components/Feed";
import ProfileCard from "~/components/ProfileCard";
import FollowingListCard from "~/components/FollowingListCard";

const Home: NextPage = () => {
  return (
    <>
      <Head>
        <title>Create T3 App</title>
        <meta name="description" content="Generated by create-t3-app" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Layout>
        <>
          <div className="flex-grow">
            <Feed />
          </div>
          <div className="w-1/3 gap-y-8">
            <ProfileCard />
            <FollowingListCard />
          </div>
        </>
      </Layout>
    </>
  );
};

export default Home;
