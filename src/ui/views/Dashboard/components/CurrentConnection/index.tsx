import { message, Tooltip } from 'antd';
import { ConnectedSite } from 'background/service/permission';
import clsx from 'clsx';
import { CHAINS_ENUM } from 'consts';
import React, { memo, useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import IconDisconnect from 'ui/assets/icon-disconnect.svg';
import IconDapps from 'ui/assets/dapps.svg';
import { ChainSelector, FallbackSiteLogo } from 'ui/component';
import { getCurrentTab, useWallet } from 'ui/utils';
import './style.less';
import { useLocation } from 'react-router-dom';
import { getOriginFromUrl } from '@/utils';
import { matomoRequestEvent } from '@/utils/matomo-request';

interface CurrentConnectionProps {
  onChainChange?: (chain: CHAINS_ENUM) => void;
}
export const CurrentConnection = memo((props: CurrentConnectionProps) => {
  const { onChainChange } = props;
  const wallet = useWallet();
  const { t } = useTranslation();
  const [site, setSite] = useState<ConnectedSite | null>(null);
  const { state } = useLocation<{
    trigger?: string;
    showChainsModal?: boolean;
  }>();
  const { showChainsModal = false, trigger } = state ?? {};

  const [visible, setVisible] = useState(
    trigger === 'current-connection' && showChainsModal
  );

  const getCurrentSite = useCallback(async () => {
    const tab = await getCurrentTab();
    if (!tab.id || !tab.url) return;
    const domain = getOriginFromUrl(tab.url);
    const current = await wallet.getCurrentSite(tab.id, domain);
    setSite(current);
  }, []);

  const handleRemove = async (origin: string) => {
    await wallet.removeConnectedSite(origin);
    getCurrentSite();
    message.success({
      icon: <i />,
      content: <span className="text-white">{t('Disconnected')}</span>,
    });
  };

  const handleChangeDefaultChain = async (chain: CHAINS_ENUM) => {
    const _site = {
      ...site!,
      chain,
    };
    setSite(_site);
    setVisible(false);
    onChainChange?.(chain);
    await wallet.setSite(_site);
    const rpc = await wallet.getCustomRpcByChain(chain);
    if (rpc) {
      const avaliable = await wallet.pingCustomRPC(chain);
      if (!avaliable) {
        message.error('The custom RPC is unavailable');
      }
    }
  };

  useEffect(() => {
    getCurrentSite();
  }, []);

  const Content = site && (
    <div className="site mr-[18px]">
      <FallbackSiteLogo
        url={site.icon}
        origin={site.origin}
        width="28px"
        className="site-icon"
      ></FallbackSiteLogo>
      <div className="site-content">
        <div className="site-name" title={site?.origin}>
          {site?.origin}
        </div>
        <div className={clsx('site-status', site?.isConnected && 'active')}>
          {site?.isConnected ? 'Connected' : 'Not connected'}
          <img
            src={IconDisconnect}
            className="site-status-icon"
            alt=""
            onClick={() => handleRemove(site!.origin)}
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className={clsx('current-connection-block')}>
      {site ? (
        site.isConnected ? (
          Content
        ) : (
          <Tooltip
            placement="topLeft"
            overlayClassName="rectangle current-connection-block-tooltip"
            align={{
              offset: [-12, -15],
            }}
            title="Rabby is not connected to the current Dapp.To connect, find and click the connect button on the Dapp’s webpage."
          >
            {Content}
          </Tooltip>
        )
      ) : (
        <div className="site is-empty">
          <img src={IconDapps} className="site-icon" alt="" />
          <div className="site-content">No Dapp found, refresh web page</div>
        </div>
      )}
      <ChainSelector
        className={clsx(!site && 'disabled')}
        value={site?.chain || CHAINS_ENUM.ETH}
        onChange={handleChangeDefaultChain}
        showModal={visible}
        onAfterOpen={() => {
          matomoRequestEvent({
            category: 'Front Page Click',
            action: 'Click',
            label: 'Change Chain',
          });
        }}
        showRPCStatus
      />
    </div>
  );
});
