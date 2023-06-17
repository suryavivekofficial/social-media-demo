import type { Messages } from "@prisma/client";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import type { NextPage } from "next";
import { useSession } from "next-auth/react";
import Head from "next/head";
import { useEffect, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import Layout from "~/components/Layout";
import Clock from "~/components/icons/ClockIcon";
import LoadingSpinner from "~/components/icons/LoadingSpinner";
import SendIcon from "~/components/icons/SendIcon";
import { api } from "~/utils/api";
import { pusherClient } from "~/utils/pusher";
import { formatChannelName } from "~/utils/snippets/formatPusher";

dayjs.extend(relativeTime);

const MessagesPage: NextPage = () => {
  return (
    <>
      <Head>
        <title>Dev Network | Messages</title>
        <meta name="description" content="Generated by create-t3-app" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Layout>
        <div className="mb-4 mr-8 h-[calc(100vh-10rem)] w-full space-y-2">
          <h2 className="-mt-2 ml-1 text-xl">Your chats</h2>
          <ChatView />
        </div>
      </Layout>
    </>
  );
};

const ChatView = () => {
  const { data: session } = useSession();
  // const { data, isLoading } = api.chat.getChatList.useQuery();
  const { data, isLoading } = api.user.getAllUsers.useQuery();
  const [selectedChat, setSelectedChat] = useState<string | null>(null);

  // const temp = new Array<string>(45).fill("username");
  if (!session) {
    return <div>You need to sign in.</div>;
  }

  if (isLoading)
    return (
      <div>
        <LoadingSpinner />
      </div>
    );

  if (!data) return <div>Follow someone to msg them.</div>;

  return (
    <div className="flex h-full w-full rounded-md border border-blue-2 bg-white dark:border-accent-6 dark:bg-black">
      <div className="w-1/4 space-y-2 overflow-y-scroll border-r border-blue-2 p-2 dark:border-accent-6">
        {isLoading && (
          <div>
            <LoadingSpinner />
          </div>
        )}
        {data.map((user) => {
          const username = user.username || "Error";
          return (
            <button
              onClick={() => setSelectedChat(username)}
              className={`${
                selectedChat === username
                  ? "relative rounded-md bg-blue-1 before:absolute before:left-0 before:top-1/2 before:h-4 before:w-1 before:-translate-y-1/2 before:rounded-sm before:bg-blue-2 before:content-[''] dark:bg-accent-2 dark:before:bg-white"
                  : ""
              } w-full cursor-pointer border-b border-blue-1 p-2 pl-4 text-left outline-none duration-300 hover:rounded-md hover:bg-blue-1 dark:border-accent-2 dark:hover:bg-accent-2`}
              key={username}
            >
              {username}
            </button>
          );
        })}
      </div>
      {selectedChat ? (
        <div className="flex flex-grow flex-col">
          <Msgs selectedChat={selectedChat} />
          <NewMsgInput receiverUsername={selectedChat} />
        </div>
      ) : (
        <div className="flex flex-grow items-center justify-center">
          <div>Select a chat to view.</div>
        </div>
      )}
    </div>
  );
};

const Msgs = ({ selectedChat }: { selectedChat: string }) => {
  const { data: session } = useSession();

  const { data, isLoading } = api.chat.getChat.useQuery({
    otherUsername: selectedChat,
  });

  const ctx = api.useContext();

  useEffect(() => {
    if (!session) return;

    const channelName = formatChannelName(session.user.username, selectedChat);
    const channel = pusherClient.subscribe(`newMsg_${channelName}`);

    const handlePusher = (newMsgFromPusher: Messages) => {
      // Modify the react query state (here) only if a msg is recieved.
      // Because the sender state is modified in the new msg input component. (via optimistic updates)
      if (newMsgFromPusher.senderUsername === session.user.username) return;

      ctx.chat.getChat.setData({ otherUsername: selectedChat }, (oldMsgs) => {
        const newMsgsState = Array.isArray(oldMsgs)
          ? [...oldMsgs, newMsgFromPusher]
          : [newMsgFromPusher];
        return newMsgsState;
      });
    };

    channel.bind("msgEvent", (data: Messages) => handlePusher(data));

    return () => {
      pusherClient.unsubscribe(`newMsg_${channelName}`);
      pusherClient.unbind("msgEvent", (data: Messages) => handlePusher(data));
    };
  }, [ctx.chat.getChat, selectedChat, session]);

  const msgsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    msgsRef.current?.scrollIntoView();
  }, [data]);

  if (isLoading)
    return (
      <div className="flex w-full flex-grow items-center justify-center">
        <LoadingSpinner />
      </div>
    );

  if (data?.length === 0 || !data) {
    return (
      <div className="flex w-full flex-grow items-center justify-center">
        Start sending msgs now.
      </div>
    );
  }

  return (
    <div className="w-full flex-grow overflow-y-scroll rounded-md p-4">
      {data.map((msg) => {
        if (session?.user.username === msg.senderUsername) {
          return <SentMsg key={msg.id} msg={msg} />;
        } else if (session?.user.username === msg.receiverUsername) {
          return <RecievedMsg key={msg.id} msg={msg} />;
        }
      })}
      <div ref={msgsRef} />
    </div>
  );
};

const SentMsg = ({ msg }: { msg: Messages }) => {
  return (
    <div className="flex w-full">
      <span className="my-2 ml-auto w-3/4 max-w-max rounded-md bg-blue-1 px-4 py-2 dark:bg-accent-2">
        <p>{msg.message}</p>
        <div className="flex py-2 text-xs">
          <span className="ml-auto flex space-x-2">
            <Clock size={4} />
            <p>{dayjs(msg.sentAt).fromNow()}</p>
          </span>
        </div>
      </span>
    </div>
  );
};

const RecievedMsg = ({ msg }: { msg: Messages }) => {
  return (
    <div className="flex w-full">
      <span className="my-2 mr-auto w-3/4 max-w-max rounded-md bg-blue-1 px-4 py-2 dark:bg-accent-2">
        <p>{msg.message}</p>
        <div className="flex py-2 text-xs">
          <span className="ml-auto flex space-x-2">
            <Clock size={4} />
            <p>{dayjs(msg.sentAt).fromNow()}</p>
          </span>
        </div>
      </span>
    </div>
  );
};

const NewMsgInput = ({ receiverUsername }: { receiverUsername: string }) => {
  const [newMsg, setNewMsg] = useState("");
  const { data: session } = useSession();
  if (!session) return null;

  const ctx = api.useContext();
  const { mutate } = api.chat.newMsg.useMutation({
    onMutate: async ({ msgContent, msgReciever }) => {
      // cancel any outgoing queries
      // await ctx.post.getPosts.cancel();
      await ctx.chat.getChat.cancel();

      // get the data from query cache
      const prevPostsSnapshot = ctx.chat.getChat.getData();

      // Modify the cache
      ctx.chat.getChat.setData(
        { otherUsername: receiverUsername },
        (oldMsgs) => {
          const newMsg: Messages = {
            message: msgContent,
            senderUsername: session?.user.username,
            receiverUsername: msgReciever,
            sentAt: Date.now() as unknown as Date,
            id: (Math.random() * 10000).toString(),
          };

          const newMsgsState = Array.isArray(oldMsgs)
            ? [...oldMsgs, newMsg]
            : [newMsg];
          return newMsgsState;
        }
      );

      return prevPostsSnapshot;
    },
    onError(error, _, prevPostsSnapshot) {
      ctx.chat.getChat.setData(
        { otherUsername: receiverUsername },
        prevPostsSnapshot
      );
      toast(error.message);
    },

    onSettled() {
      void ctx.chat.getChat.invalidate();
    },
  });

  const handleSubmit = () => {
    setNewMsg("");
    mutate({ msgContent: newMsg, msgReciever: receiverUsername });
  };

  return (
    <div className="flex w-full space-x-4 border-t border-blue-2 p-4 dark:border-accent-4">
      <input
        onChange={(e) => setNewMsg(e.target.value)}
        value={newMsg}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            handleSubmit();
          }
        }}
        type="text"
        name="new message"
        autoComplete="off"
        className="flex-grow rounded-md border border-blue-2 bg-white px-4 py-2 outline-none focus:ring-1 focus:ring-blue-2 dark:border-accent-4 dark:bg-black"
      />
      <button
        onClick={handleSubmit}
        className="group rounded-md border border-blue-2 p-2 text-blue-2 drop-shadow-lg dark:border-accent-4 dark:text-white"
      >
        <SendIcon />
      </button>
    </div>
  );
};

export default MessagesPage;
