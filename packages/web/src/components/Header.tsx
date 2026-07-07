import { useAuthenticator } from '@aws-amplify/ui-react';

type Props = {
  showMyPage?: boolean;
};

function Header({ showMyPage = false }: Props) {
  const { signOut } = useAuthenticator();
  return (
    <header className="site-header">
      <div className="header-container">
        <h1 className="site-title"><a href="/">🍔 JavaEats</a></h1>
        <div className="user-info">
          {showMyPage && <a href="/user/profile" className="btn-mypage">マイページ</a>}
          <button className="btn-logout" onClick={signOut}>ログアウト</button>
        </div>
      </div>
    </header>
  );
}

export default Header;
